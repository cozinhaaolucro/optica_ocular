import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
// Deliberately impossible database path: no preview read may initialize SQLite.
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.VERCEL = "1";
process.env.OCULAR_DB_PATH = resolve("package.json", "preview.sqlite");
const { getProducts, getProduct, resolveLines, saveProduct } =
  await import("../src/lib/catalog");
const { db } = await import("../src/lib/db");
const { createOrder } = await import("../src/lib/orders");
const { PersistenceUnavailableError, isCatalogPreview } =
  await import("../src/lib/storage-mode");
const { apiError } = await import("../src/lib/http");
const { canSell } = await import("../src/lib/product");
test("Vercel reads the full public catalog and cart without a writable database", async () => {
  const products = await getProducts();
  assert.equal(products.length, 33);
  assert.deepEqual(
    new Set(products.map((p) => p.category)),
    new Set(["grau", "sol"]),
  );
  assert(
    products.every(
      (p) =>
        !canSell(p) &&
        !p.priceConfirmed &&
        !p.images.length &&
        p.variants[0].stock === 0,
    ),
  );
  const p = products[0];
  assert.deepEqual(await getProduct(p.id), p);
  assert.equal(await getProduct("missing-model"), undefined);
  const line = (
    await resolveLines([
      { productId: p.id, variantId: p.variants[0].id, quantity: 2 },
    ])
  )[0];
  assert.equal(line.priceCents, p.variants[0].priceCents);
  assert.equal(line.quantity, 2);
  p.variants[0].priceCents = 1;
  p.features.push("mutated");
  assert.notEqual((await getProduct(p.id))!.variants[0].priceCents, 1);
  assert(!(await getProduct(p.id))!.features.includes("mutated"));
});
test("preview refuses ephemeral commercial writes and returns a controlled response", async () => {
  assert.throws(() => db(), PersistenceUnavailableError);
  await assert.rejects(
    async () => await saveProduct((await getProducts())[0]),
    PersistenceUnavailableError,
  );
  const p = (await getProducts())[0];
  await assert.rejects(
    async () =>
      await createOrder({
        items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 1 }],
        customer: {
          name: "Teste preview",
          email: "preview@example.com",
          phone: "41999990000",
        },
        privacyAccepted: true,
        idempotencyKey: randomUUID(),
      }),
    PersistenceUnavailableError,
  );
  const response = apiError(new PersistenceUnavailableError());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    (await response.json()).error,
    new PersistenceUnavailableError().message,
  );
});
test("local preview can be enabled independently; Vercel never uses local storage", async () => {
  delete process.env.VERCEL;
  process.env.OCULAR_CATALOG_PREVIEW = "true";
  assert(isCatalogPreview());
  assert.equal((await getProducts(true)).length, 33);
  process.env.OCULAR_CATALOG_PREVIEW = "false";
  assert(!isCatalogPreview());
  process.env.VERCEL = "1";
  assert(isCatalogPreview());
});
