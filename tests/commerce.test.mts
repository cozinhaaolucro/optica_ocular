import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

const folder = mkdtempSync(join(tmpdir(), "ocular-test-"));
process.env.OCULAR_DB_PATH = join(folder, "test.sqlite");
const { db, rateLimit } = await import("../src/lib/db");
const { getProducts, getProduct, saveProduct, resolveLines } =
  await import("../src/lib/catalog");
const {
  createOrder,
  getOrder,
  releaseOrder,
  reconcilePayment,
  updateFulfillment,
  publicOrder,
} = await import("../src/lib/orders");
const { canSell } = await import("../src/lib/product");
const { checkPassword, hashToken } = await import("../src/lib/auth");
const { readJson, sameOrigin } = await import("../src/lib/http");
after(() => {
  db().close();
  if (
    dirname(folder) === tmpdir() &&
    folder.split(/[\\/]/).at(-1)?.startsWith("ocular-test-")
  )
    rmSync(folder, { recursive: true });
});
function fixture(stock = 3) {
  const p = structuredClone(getProducts()[0]);
  p.id = `test-${randomUUID()}`;
  p.slug = p.id;
  p.revision = 0;
  p.name = "Modelo de teste";
  p.material = "Acetato";
  p.images = [
    "/assets/ensaio/grau-retrato-1122.webp",
    "/assets/ensaio/sol-retrato-1122.webp",
    "/assets/ensaio/lentes-detalhe-1280.webp",
  ];
  p.priceConfirmed = true;
  p.verified = true;
  p.variants = [
    {
      id: `${p.id}-black`,
      sku: p.id,
      label: "Preto · 52",
      color: "Preto",
      lensWidth: 52,
      bridge: 18,
      temple: 140,
      priceCents: 34990,
      stock,
    },
  ];
  return saveProduct(p);
}
const lines = (p: ReturnType<typeof fixture>, quantity = 1) => [
  { productId: p.id, variantId: p.variants[0].id, quantity },
];
const input = (p: ReturnType<typeof fixture>, quantity = 1) => ({
  items: lines(p, quantity),
  customer: {
    name: "Pessoa de Teste",
    email: "teste@example.com",
    phone: "(41) 99999-0000",
  },
  privacyAccepted: true,
  idempotencyKey: randomUUID(),
});

test("seed is honest: placeholders, no confirmed stock or price", () => {
  const ps = getProducts();
  assert.equal(ps.length, 33);
  assert(
    ps.every(
      (p) =>
        !canSell(p) &&
        !p.verified &&
        !p.priceConfirmed &&
        p.images.length === 0 &&
        p.variants.every((v) => v.stock === 0),
    ),
  );
});
test("server prices prevail; extra totals, fractional quantities and duplicates are rejected", () => {
  const p = fixture();
  assert.equal(resolveLines(lines(p, 2))[0].priceCents, 34990);
  assert.throws(() => resolveLines([{ ...lines(p)[0], priceCents: 1 }]));
  assert.throws(() => resolveLines(lines(p, 1.5)));
  assert.throws(() => resolveLines(lines(p, 11)));
  assert.throws(() => resolveLines([...lines(p), ...lines(p)]));
});
test("unvalidated product cannot become a sale; quotation preserves inventory", () => {
  const p = getProducts().find((p) => !p.verified)!;
  const a = input(p);
  assert.throws(() => createOrder(a, true), /disponibilidade/);
  const result = createOrder(a);
  assert.equal(result.order.status, "quote_requested");
  assert.equal(result.order.reserved, false);
  assert.equal(getProduct(p.id)!.variants[0].stock, 0);
  assert.equal(result.order.token, hashToken(result.accessToken!));
  assert.equal("token" in publicOrder(result.order), false);
});
test("idempotent retry creates exactly one order and notification, including after price change", () => {
  const p = fixture(),
    a = input(p);
  const first = createOrder(a);
  const updated = getProduct(p.id)!;
  updated.variants[0].priceCents = 59990;
  saveProduct(updated);
  const retry = createOrder(a);
  assert.equal(retry.order.id, first.order.id);
  assert.equal(retry.order.totalCents, 34990);
  assert.equal(
    db()
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE id=?")
      .get(first.order.id)!.n,
    1,
  );
  assert.throws(
    () => createOrder({ ...a, items: lines(p, 2) }),
    /carrinho mudou/,
  );
});
test("stock reservation is atomic, does not oversell and rejects stale admin writes", () => {
  const p = fixture(2);
  createOrder(input(p, 2), true);
  assert.equal(getProduct(p.id)!.variants[0].stock, 0);
  assert.throws(() => createOrder(input(p), true), /disponibilidade/);
  assert.throws(() => saveProduct(p), /mudou/);
});
test("multi-item reservation failure rolls back without touching other inventory", () => {
  const available = fixture(2),
    empty = fixture(0);
  const a = input(available);
  assert.throws(() =>
    createOrder({ ...a, items: [...lines(available), ...lines(empty)] }, true),
  );
  assert.equal(getProduct(available.id)!.variants[0].stock, 2);
  assert.equal(
    db()
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE idem=?")
      .get(a.idempotencyKey)!.n,
    0,
  );
});
test("cancel/failure returns stock once; late payment requires review and cannot fulfill", () => {
  const p = fixture(1),
    { order } = createOrder(input(p), true);
  releaseOrder(order.id, "cancelled");
  releaseOrder(order.id, "cancelled");
  assert.equal(getProduct(p.id)!.variants[0].stock, 1);
  const reconciled = reconcilePayment(order.id, {
    id: "late",
    status: "paid",
    amountCents: order.totalCents,
    currency: "BRL",
  });
  assert.equal(reconciled.status, "review_required");
  assert.throws(
    () =>
      updateFulfillment(order.id, {
        fulfillment: "collected",
        tracking: "",
        note: "",
      }),
    /pagamento/,
  );
});
test("verified payment handles duplicates, late pending and refund without duplicating inventory", () => {
  const p = fixture(2),
    { order } = createOrder(input(p), true);
  const payment = {
    id: "payment-test",
    status: "paid" as const,
    amountCents: order.totalCents,
    currency: "BRL",
  };
  assert.equal(reconcilePayment(order.id, payment).status, "paid");
  reconcilePayment(order.id, payment);
  assert.equal(
    reconcilePayment(order.id, { ...payment, status: "awaiting_payment" })
      .status,
    "paid",
  );
  assert.equal(getProduct(p.id)!.variants[0].stock, 1);
  assert.throws(() => releaseOrder(order.id, "cancelled"));
  assert.equal(
    reconcilePayment(order.id, { ...payment, status: "refunded" }).status,
    "refunded",
  );
  reconcilePayment(order.id, { ...payment, status: "refunded" });
  assert.equal(getProduct(p.id)!.variants[0].stock, 2);
  assert.equal(reconcilePayment(order.id, payment).status, "refunded");
});
test("amount, currency and payment identifier mismatches cannot confirm payment", () => {
  for (const patch of [{ amountCents: 1 }, { currency: "USD" }]) {
    const p = fixture(),
      { order } = createOrder(input(p), true);
    assert.equal(
      reconcilePayment(order.id, {
        id: "bad",
        status: "paid",
        amountCents: order.totalCents,
        currency: "BRL",
        ...patch,
      }).status,
      "review_required",
    );
  }
  const p = fixture(),
    { order } = createOrder(input(p), true);
  reconcilePayment(order.id, {
    id: "first",
    status: "awaiting_payment",
    amountCents: order.totalCents,
    currency: "BRL",
  });
  assert.equal(
    reconcilePayment(order.id, {
      id: "other",
      status: "paid",
      amountCents: order.totalCents,
      currency: "BRL",
    }).status,
    "review_required",
  );
});
test("quotation rejects payment reconciliation", () => {
  const p = fixture(),
    { order } = createOrder(input(p));
  assert.throws(
    () =>
      reconcilePayment(order.id, {
        id: "invalid",
        status: "paid",
        amountCents: order.totalCents,
        currency: "BRL",
      }),
    /orçamento/,
  );
  assert.equal(getOrder(order.id)!.status, "quote_requested");
});
test("catalog validation rejects placeholders, duplicate SKUs and removal of reserved variants", () => {
  const p = fixture();
  assert.throws(
    () =>
      saveProduct({
        ...p,
        images: ["/assets/placeholders/frontal.svg", ...p.images.slice(1)],
      }),
    /Complete/,
  );
  const duplicate = {
    ...p,
    id: `test-${randomUUID()}`,
    slug: `test-${randomUUID()}`,
    revision: 0,
  };
  assert.throws(() => saveProduct(duplicate), /SKU/);
  createOrder(input(p), true);
  const latest = getProduct(p.id)!;
  latest.variants[0].id = "changed-variant";
  assert.throws(() => saveProduct(latest), /reservado/);
});
test("password and rate limits fail closed", () => {
  delete process.env.OCULAR_ADMIN_PASSWORD;
  assert.equal(checkPassword("password"), false);
  process.env.OCULAR_ADMIN_PASSWORD = "a".repeat(32);
  assert.equal(checkPassword("a".repeat(32)), true);
  assert.equal(checkPassword("b".repeat(32)), false);
  const key = randomUUID();
  assert.equal(rateLimit(key, 2), true);
  assert.equal(rateLimit(key, 2), true);
  assert.equal(rateLimit(key, 2), false);
});
test("cross-origin mutation and oversized JSON are rejected", async () => {
  assert.throws(() =>
    sameOrigin(
      new Request("http://localhost:3000/api/orders", {
        headers: { origin: "https://another.example" },
      }),
    ),
  );
  await assert.rejects(
    () =>
      readJson(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "a".repeat(65000) }),
        }),
      ),
    /grande/,
  );
});
test("optional telemetry accepts technical metrics and rejects personal fields", async () => {
  const { POST } = await import("../src/app/api/telemetry/route");
  const oldSite = process.env.OCULAR_SITE_URL;
  process.env.OCULAR_SITE_URL = "http://localhost";
  process.env.OCULAR_TELEMETRY_ENABLED = "true";
  const send = (body: unknown) =>
    POST(
      new Request("http://localhost/api/telemetry", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    assert.equal(
      (await send({ event: "metric", name: "LCP", value: 1234 })).status,
      204,
    );
    assert.equal(
      (
        await send({
          event: "add_to_cart",
          category: "grau",
          email: "private@example.com",
        })
      ).status,
      400,
    );
    const record = db()
      .prepare("SELECT body FROM events WHERE type=? ORDER BY id DESC LIMIT 1")
      .get("telemetry") as { body: string };
    assert.deepEqual(JSON.parse(record.body), {
      event: "metric",
      name: "LCP",
      value: 1234,
    });
  } finally {
    delete process.env.OCULAR_TELEMETRY_ENABLED;
    if (oldSite) process.env.OCULAR_SITE_URL = oldSite;
    else delete process.env.OCULAR_SITE_URL;
  }
});
