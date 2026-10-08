import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
const folder = mkdtempSync(join(tmpdir(), "ocular-test-"));
process.env.OCULAR_DB_PATH = join(folder, "test.sqlite");
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;
delete process.env.OCULAR_CATALOG_PREVIEW;
const { db } = await import("../src/lib/db");
const { rateLimit } = await import("../src/lib/persistence");
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
const { canSell, sellingPrice, minPrice } = await import("../src/lib/product");
const { checkPassword, hashToken } = await import("../src/lib/auth");
const { readJson, sameOrigin } = await import("../src/lib/http");
const { updateInventory, setPublished } = await import("../src/lib/admin");
const { updateService } = await import("../src/lib/orders");
const { getLenses, getLensData, saveLensPrices, updateLensGroup } =
  await import("../src/lib/lenses");
const { csv } = await import("../src/lib/admin-utils");

test("acesso local aceita a própria origem sem liberar origens externas na Vercel", () => {
  const previousUrl = process.env.OCULAR_SITE_URL;
  const previousVercel = process.env.VERCEL;
  try {
    process.env.OCULAR_SITE_URL = "https://optica-ocular.vercel.app";
    sameOrigin(
      new Request("http://localhost:4012/api/admin/session", {
        headers: { origin: "http://localhost:4012" },
      }),
    );
    assert.throws(() =>
      sameOrigin(
        new Request("http://localhost:4012/api/admin/session", {
          headers: { origin: "https://foreign.example" },
        }),
      ),
    );
    process.env.VERCEL = "1";
    assert.throws(() =>
      sameOrigin(
        new Request("http://localhost:4012/api/admin/session", {
          headers: { origin: "http://localhost:4012" },
        }),
      ),
    );
    sameOrigin(
      new Request("https://optica-ocular.vercel.app/api/admin/session", {
        headers: { origin: "https://optica-ocular.vercel.app" },
      }),
    );
    assert.throws(() =>
      sameOrigin(
        new Request("https://optica-ocular.vercel.app/api/admin/session", {
          headers: { origin: "https://foreign.example" },
        }),
      ),
    );
  } finally {
    if (previousUrl === undefined) delete process.env.OCULAR_SITE_URL;
    else process.env.OCULAR_SITE_URL = previousUrl;
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }
});
after(() => {
  db().close();
  if (
    dirname(folder) === tmpdir() &&
    folder.split(/[\\/]/).at(-1)?.startsWith("ocular-test-")
  )
    rmSync(folder, { recursive: true });
});
async function fixture(stock = 3) {
  const p = structuredClone((await getProducts())[0]);
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
  return await saveProduct(p);
}
const lines = (p: Awaited<ReturnType<typeof fixture>>, quantity = 1) => [
  { productId: p.id, variantId: p.variants[0].id, quantity },
];
const input = (p: Awaited<ReturnType<typeof fixture>>, quantity = 1) => ({
  items: lines(p, quantity),
  customer: {
    name: "Pessoa de Teste",
    email: "teste@example.com",
    phone: "(41) 99999-0000",
  },
  privacyAccepted: true,
  idempotencyKey: randomUUID(),
});
test("seed is honest: placeholders, no confirmed stock or price", async () => {
  const ps = await getProducts();
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
test("server prices prevail; extra totals, fractional quantities and duplicates are rejected", async () => {
  const p = await fixture();
  assert.equal((await resolveLines(lines(p, 2)))[0].priceCents, 34990);
  await assert.rejects(
    async () => await resolveLines([{ ...lines(p)[0], priceCents: 1 }]),
  );
  await assert.rejects(async () => await resolveLines(lines(p, 1.5)));
  await assert.rejects(async () => await resolveLines(lines(p, 11)));
  await assert.rejects(
    async () => await resolveLines([...lines(p), ...lines(p)]),
  );
});
test("unvalidated product cannot become a sale; quotation preserves inventory", async () => {
  const p = (await getProducts()).find((p) => !p.verified)!;
  const a = input(p);
  await assert.rejects(
    async () => await createOrder(a, true),
    /disponibilidade/,
  );
  const result = await createOrder(a);
  assert.equal(result.order.status, "quote_requested");
  assert.equal(result.order.reserved, false);
  assert.equal((await getProduct(p.id))!.variants[0].stock, 0);
  assert.equal(result.order.token, hashToken(result.accessToken!));
  assert.equal("token" in publicOrder(result.order), false);
});
test("idempotent retry creates exactly one order and notification, including after price change", async () => {
  const p = await fixture(),
    a = input(p);
  const first = await createOrder(a);
  const updated = (await getProduct(p.id))!;
  updated.variants[0].priceCents = 59990;
  await saveProduct(updated);
  const retry = await createOrder(a);
  assert.equal(retry.order.id, first.order.id);
  assert.equal(retry.order.totalCents, 34990);
  assert.equal(
    db()
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE id=?")
      .get(first.order.id)!.n,
    1,
  );
  await assert.rejects(
    async () => await createOrder({ ...a, items: lines(p, 2) }),
    /carrinho mudou/,
  );
});
test("stock reservation is atomic, does not oversell and rejects stale admin writes", async () => {
  const p = await fixture(2);
  await createOrder(input(p, 2), true);
  assert.equal((await getProduct(p.id))!.variants[0].stock, 0);
  await assert.rejects(
    async () => await createOrder(input(p), true),
    /disponibilidade/,
  );
  await assert.rejects(async () => await saveProduct(p), /mudou/);
});
test("multi-item reservation failure rolls back without touching other inventory", async () => {
  const available = await fixture(2),
    empty = await fixture(0);
  const a = input(available);
  await assert.rejects(
    async () =>
      await createOrder(
        { ...a, items: [...lines(available), ...lines(empty)] },
        true,
      ),
  );
  assert.equal((await getProduct(available.id))!.variants[0].stock, 2);
  assert.equal(
    db()
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE idem=?")
      .get(a.idempotencyKey)!.n,
    0,
  );
});
test("cancel/failure returns stock once; late payment requires review and cannot fulfill", async () => {
  const p = await fixture(1),
    { order } = await createOrder(input(p), true);
  await releaseOrder(order.id, "cancelled");
  await releaseOrder(order.id, "cancelled");
  assert.equal((await getProduct(p.id))!.variants[0].stock, 1);
  const reconciled = await reconcilePayment(order.id, {
    id: "late",
    status: "paid",
    amountCents: order.totalCents,
    currency: "BRL",
  });
  assert.equal(reconciled.status, "review_required");
  await assert.rejects(
    async () =>
      await updateFulfillment(order.id, {
        fulfillment: "collected",
        tracking: "",
        note: "",
      }),
    /pagamento/,
  );
});
test("verified payment handles duplicates, late pending and refund without duplicating inventory", async () => {
  const p = await fixture(2),
    { order } = await createOrder(input(p), true);
  const payment = {
    id: "payment-test",
    status: "paid" as const,
    amountCents: order.totalCents,
    currency: "BRL",
  };
  assert.equal((await reconcilePayment(order.id, payment)).status, "paid");
  await reconcilePayment(order.id, payment);
  assert.equal(
    (
      await reconcilePayment(order.id, {
        ...payment,
        status: "awaiting_payment",
      })
    ).status,
    "paid",
  );
  assert.equal((await getProduct(p.id))!.variants[0].stock, 1);
  await assert.rejects(async () => await releaseOrder(order.id, "cancelled"));
  assert.equal(
    (await reconcilePayment(order.id, { ...payment, status: "refunded" }))
      .status,
    "refunded",
  );
  await reconcilePayment(order.id, { ...payment, status: "refunded" });
  assert.equal((await getProduct(p.id))!.variants[0].stock, 2);
  assert.equal((await reconcilePayment(order.id, payment)).status, "refunded");
});
test("amount, currency and payment identifier mismatches cannot confirm payment", async () => {
  for (const patch of [{ amountCents: 1 }, { currency: "USD" }]) {
    const p = await fixture(),
      { order } = await createOrder(input(p), true);
    assert.equal(
      (
        await reconcilePayment(order.id, {
          id: "bad",
          status: "paid",
          amountCents: order.totalCents,
          currency: "BRL",
          ...patch,
        })
      ).status,
      "review_required",
    );
  }
  const p = await fixture(),
    { order } = await createOrder(input(p), true);
  await reconcilePayment(order.id, {
    id: "first",
    status: "awaiting_payment",
    amountCents: order.totalCents,
    currency: "BRL",
  });
  assert.equal(
    (
      await reconcilePayment(order.id, {
        id: "other",
        status: "paid",
        amountCents: order.totalCents,
        currency: "BRL",
      })
    ).status,
    "review_required",
  );
});
test("quotation rejects payment reconciliation", async () => {
  const p = await fixture(),
    { order } = await createOrder(input(p));
  await assert.rejects(
    async () =>
      await reconcilePayment(order.id, {
        id: "invalid",
        status: "paid",
        amountCents: order.totalCents,
        currency: "BRL",
      }),
    /orçamento/,
  );
  assert.equal((await getOrder(order.id))!.status, "quote_requested");
});
test("catalog validation rejects placeholders, duplicate SKUs and removal of reserved variants", async () => {
  const p = await fixture();
  await assert.rejects(
    async () =>
      await saveProduct({
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
  await assert.rejects(async () => await saveProduct(duplicate), /SKU/);
  await createOrder(input(p), true);
  const latest = (await getProduct(p.id))!;
  latest.variants[0].id = "changed-variant";
  await assert.rejects(async () => await saveProduct(latest), /reservado/);
});
test("password and rate limits fail closed", async () => {
  delete process.env.OCULAR_ADMIN_PASSWORD;
  assert.equal(checkPassword("password"), false);
  process.env.OCULAR_ADMIN_PASSWORD = "a".repeat(32);
  assert.equal(checkPassword("a".repeat(32)), true);
  assert.equal(checkPassword("b".repeat(32)), false);
  const key = randomUUID();
  assert.equal(await rateLimit(key, 2), true);
  assert.equal(await rateLimit(key, 2), true);
  assert.equal(await rateLimit(key, 2), false);
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
      .get("telemetry") as {
      body: string;
    };
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

test("concurrent reservations cannot oversell the last unit", async () => {
  const product = await fixture(1);
  const results = await Promise.allSettled([
    createOrder(input(product), true),
    createOrder(input(product), true),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal((await getProduct(product.id))!.variants[0].stock, 0);
});

test("service updates are versioned and internal notes never reach the customer", async () => {
  const product = await fixture();
  const { order } = await createOrder(input(product));
  const updated = await updateService(order.id, {
    revision: order.revision,
    serviceStatus: "quoted",
    note: "Preferencia interna da equipe",
  });
  assert.equal(updated.serviceStatus, "quoted");
  assert.equal("note" in publicOrder(updated), false);
  assert.equal("revision" in publicOrder(updated), false);
  await assert.rejects(
    () =>
      updateService(order.id, {
        revision: order.revision,
        serviceStatus: "completed",
        note: "",
      }),
    /mudou/,
  );
  assert.equal(
    (await getOrder(order.id))!.note,
    "Preferencia interna da equipe",
  );
});

test("inventory adjustments record the reason and reject stale updates", async () => {
  const product = await fixture(3);
  const change = {
    productId: product.id,
    variantId: product.variants[0].id,
    revision: product.revision,
    stock: 7,
    priceCents: 39990,
    reason: "Entrada de mercadoria",
  };
  const updated = await updateInventory(change);
  assert.equal(updated.variants[0].stock, 7);
  assert.equal(updated.variants[0].priceCents, 39990);
  await assert.rejects(
    () => updateInventory({ ...change, stock: 100 }),
    /mudou/,
  );
  const record = db()
    .prepare("SELECT body FROM events WHERE type=? ORDER BY id DESC LIMIT 1")
    .get("inventory_updated") as { body: string };
  assert.equal(JSON.parse(record.body).reason, change.reason);
});

test("bulk visibility rolls back every change if any revision is stale", async () => {
  const first = await fixture(),
    second = await fixture();
  await assert.rejects(
    () =>
      setPublished({
        published: false,
        products: [
          { id: first.id, revision: first.revision },
          { id: second.id, revision: 0 },
        ],
      }),
    /mudou/,
  );
  assert.equal((await getProduct(first.id))!.published, true);
  assert.equal((await getProduct(first.id))!.revision, first.revision);
});

test("lens updates persist in the simulator and reject stale or unknown configurations", async () => {
  const before = await getLenses(),
    row = before.rows[0];
  await saveLensPrices({
    revision: before.revision,
    changes: [{ id: row.id, priceCents: 123456 }],
  });
  const after = await getLenses();
  assert.equal(after.rows[0].priceCents, 123456);
  const publicData = await getLensData();
  assert.equal(
    publicData[row.brand][row.category][row.line][row.option][0].p,
    1234.56,
  );
  await assert.rejects(
    () =>
      saveLensPrices({
        revision: before.revision,
        changes: [{ id: row.id, priceCents: 1 }],
      }),
    /mudou/,
  );
  await assert.rejects(
    () =>
      saveLensPrices({
        revision: after.revision,
        changes: [{ id: "0".repeat(24), priceCents: 1 }],
      }),
    /inválida/,
  );
  assert.equal((await getLenses()).rows[0].priceCents, 123456);
});

test("product promotions price quotes consistently and preserve historical totals after ending", async () => {
  let product = await fixture();
  product.variants[0].promotionPriceCents = 24990;
  product = await saveProduct(product);
  assert.equal(sellingPrice(product.variants[0]), 24990);
  assert.equal(minPrice(product), 24990);
  assert.equal((await resolveLines(lines(product)))[0].priceCents, 24990);
  const { order } = await createOrder(input(product, 2));
  assert.equal(order.totalCents, 49980);
  product.variants[0].promotionPriceCents = null;
  product = await saveProduct(product);
  assert.equal((await resolveLines(lines(product)))[0].priceCents, 34990);
  assert.equal((await getOrder(order.id))!.totalCents, 49980);
  assert.equal((await getOrder(order.id))!.items[0].priceCents, 24990);
});

test("invalid product promotions and normal prices below an existing offer cannot be saved", async () => {
  let product = await fixture();
  for (const promotion of [0, -1, 34990, 50000, 2.5])
    await assert.rejects(() =>
      saveProduct({
        ...product,
        variants: [{ ...product.variants[0], promotionPriceCents: promotion }],
      }),
    );
  product.variants[0].promotionPriceCents = 24990;
  product = await saveProduct(product);
  const adjustment = {
    productId: product.id,
    variantId: product.variants[0].id,
    revision: product.revision,
    stock: 3,
    priceCents: 19990,
    reason: "Conferencia promocional",
  };
  await assert.rejects(() => updateInventory(adjustment));
  assert.equal((await getProduct(product.id))!.variants[0].priceCents, 34990);
  const ended = await updateInventory({
    ...adjustment,
    promotionPriceCents: null,
  });
  assert.equal(sellingPrice(ended.variants[0]), 19990);
  const other = {
    ...ended.variants[0],
    id: "other-variant",
    priceCents: 39990,
    promotionPriceCents: 9990,
  };
  assert.equal(
    minPrice({ ...ended, variants: [...ended.variants, other] }),
    9990,
  );
});

test("lens visibility preserves IDs and promotions while removing empty public branches", async () => {
  const before = await getLenses();
  const first = before.rows[0];
  const second = before.rows.find(
    (r) =>
      r.id !== first.id &&
      r.brand === first.brand &&
      r.category === first.category &&
      r.line === first.line &&
      r.option === first.option,
  )!;
  assert(second);
  await saveLensPrices({
    revision: before.revision,
    changes: [
      {
        id: first.id,
        priceCents: 50000,
        promotionPriceCents: 40000,
        enabled: false,
      },
      { id: second.id, priceCents: 60000, promotionPriceCents: 30000 },
    ],
  });
  let data = await getLensData();
  assert.equal(
    data[first.brand][first.category][first.line][first.option][0].p,
    300,
  );
  assert.equal(
    data[first.brand][first.category][first.line][first.option][0].regularPrice,
    600,
  );
  let current = await getLenses();
  assert.equal(current.rows[0].id, first.id);
  assert.equal(current.rows[0].enabled, false);
  assert.equal(current.rows[0].promotionPriceCents, 40000);
  assert.equal(current.rows.length, before.rows.length);
  await saveLensPrices({
    revision: current.revision,
    changes: [{ id: first.id, enabled: true, promotionPriceCents: null }],
  });
  data = await getLensData();
  assert.equal(
    data[first.brand][first.category][first.line][first.option][0].p,
    500,
  );
  assert.equal(
    data[first.brand][first.category][first.line][first.option][0].regularPrice,
    undefined,
  );
  current = await getLenses();
  const lineRows = current.rows.filter(
    (r) =>
      r.brand === first.brand &&
      r.category === first.category &&
      r.line === first.line,
  );
  await updateLensGroup({
    revision: current.revision,
    expectedCount: lineRows.length,
    filter: { brand: first.brand, category: first.category, line: first.line },
    action: { type: "visibility", enabled: false },
  });
  data = await getLensData();
  assert.equal(data[first.brand]?.[first.category]?.[first.line], undefined);
  current = await getLenses();
  await updateLensGroup({
    revision: current.revision,
    expectedCount: lineRows.length,
    filter: { brand: first.brand, category: first.category, line: first.line },
    action: { type: "visibility", enabled: true },
  });
});

test("whole lens brands over 1000 configurations can be hidden and promoted atomically", async () => {
  let current = await getLenses();
  const brand = "ZEISS";
  const rows = current.rows.filter((r) => r.brand === brand);
  assert(rows.length > 1000);
  const bulk = {
    revision: current.revision,
    expectedCount: rows.length,
    filter: { brand },
    action: { type: "visibility", enabled: false },
  };
  await updateLensGroup(bulk);
  assert.equal((await getLensData())[brand], undefined);
  current = await getLenses();
  assert(
    current.rows.filter((r) => r.brand === brand).every((r) => !r.enabled),
  );
  await assert.rejects(
    () =>
      updateLensGroup({
        ...bulk,
        action: { type: "visibility", enabled: true },
      }),
    /mudou/,
  );
  await updateLensGroup({
    ...bulk,
    revision: current.revision,
    action: { type: "promotion", percent: 15 },
  });
  current = await getLenses();
  assert.equal((await getLensData())[brand], undefined);
  assert(
    current.rows
      .filter((r) => r.brand === brand)
      .every((r) => r.promotionPriceCents === Math.round(r.priceCents * 0.85)),
  );
  assert(
    current.rows
      .filter((r) => r.brand !== brand)
      .some((r) => r.promotionPriceCents === null),
  );
  await updateLensGroup({
    ...bulk,
    revision: current.revision,
    action: { type: "visibility", enabled: true },
  });
  assert((await getLensData())[brand]);
  current = await getLenses();
  await updateLensGroup({
    ...bulk,
    revision: current.revision,
    action: { type: "promotion", percent: null },
  });
  assert(
    (await getLenses()).rows
      .filter((r) => r.brand === brand)
      .every((r) => r.promotionPriceCents === null),
  );
});

test("lens batches reject invalid promotions, changed counts and partial price updates", async () => {
  const current = await getLenses(),
    [first, second] = current.rows;
  await assert.rejects(
    () =>
      saveLensPrices({
        revision: current.revision,
        changes: [
          { id: first.id, priceCents: 77777 },
          { id: second.id, promotionPriceCents: second.priceCents },
        ],
      }),
    /menor/,
  );
  let after = await getLenses();
  assert.equal(after.revision, current.revision);
  assert.equal(after.rows[0].priceCents, first.priceCents);
  await assert.rejects(
    () =>
      updateLensGroup({
        revision: current.revision,
        expectedCount: 1,
        filter: { brand: first.brand },
        action: { type: "visibility", enabled: false },
      }),
    /resultados/,
  );
  await assert.rejects(
    () =>
      updateLensGroup({
        revision: current.revision,
        expectedCount: 1,
        filter: { brand: "Marca inexistente" },
        action: { type: "promotion", percent: 10 },
      }),
    /resultados/,
  );
  await assert.rejects(() =>
    updateLensGroup({
      revision: current.revision,
      expectedCount: 1,
      filter: {},
      action: { type: "promotion", percent: 100 },
    }),
  );
  after = await getLenses();
  assert.equal(after.revision, current.revision);
  assert.equal(after.rows[0].enabled, first.enabled);
});

test("exports neutralize spreadsheet formulas and preserve quoted customer names", () => {
  const exported = csv([
    ["=SUM(A1)", "+cmd", "@formula", 'Pessoa "Teste"', "349,90"],
  ]);
  assert(exported.includes('"\'=SUM(A1)"'));
  assert(exported.includes('"\'+cmd"'));
  assert(exported.includes('"\'@formula"'));
  assert(exported.includes('"Pessoa ""Teste"""'));
});
