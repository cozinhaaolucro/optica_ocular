import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const folder = mkdtempSync(join(tmpdir(), "ocular-final-audit-"));
process.env.OCULAR_DB_PATH = join(folder, "audit.sqlite");
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;
delete process.env.OCULAR_CATALOG_PREVIEW;

const { db } = await import("../src/lib/db");
const { execute } = await import("../src/lib/persistence");
const { getProduct, getProducts, saveProduct, productSchema } =
  await import("../src/lib/catalog");
const { setPublished } = await import("../src/lib/admin");
const { readJson, secureCookie } = await import("../src/lib/http");
const { lowestAvailablePricedVariant, sellingPrice } =
  await import("../src/lib/product");

after(() => {
  db().close();
  if (
    dirname(folder) === tmpdir() &&
    folder.split(/[\\/]/).at(-1)?.startsWith("ocular-final-audit-")
  )
    rmSync(folder, { recursive: true });
});

test("JSON accepts MIME parameters and case variants but rejects unrelated types", async () => {
  const request = (type: string) =>
    new Request("http://localhost/api/admin/products", {
      method: "PUT",
      headers: { "content-type": type },
      body: '{"value":123}',
    });
  assert.deepEqual(await readJson(request("Application/JSON; charset=utf-8")), {
    value: 123,
  });
  for (const type of [
    "application/jsonp",
    "application/json-invalid",
    "text/plain",
  ])
    await assert.rejects(() => readJson(request(type)), /JSON/);
});

test("admin and order cookies stay secure on HTTPS and Vercel while allowing local HTTP", () => {
  const previousVercel = process.env.VERCEL;
  const previousSite = process.env.OCULAR_SITE_URL;
  try {
    delete process.env.VERCEL;
    process.env.OCULAR_SITE_URL = "https://optica-ocular.vercel.app";
    assert.equal(
      secureCookie(new Request("http://localhost:4012/admin")),
      false,
    );
    assert.equal(
      secureCookie(new Request("https://optica-ocular.vercel.app/admin")),
      true,
    );
    process.env.VERCEL = "1";
    delete process.env.OCULAR_SITE_URL;
    assert.equal(
      secureCookie(new Request("http://internal-vercel/admin")),
      true,
    );
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousSite === undefined) delete process.env.OCULAR_SITE_URL;
    else process.env.OCULAR_SITE_URL = previousSite;
  }
});

test("visibility supports the complete 124-product selection and remains atomic", async () => {
  const template = (await getProducts())[0];
  const selection = [];
  for (let index = 0; index < 124; index++) {
    const id = `audit-model-${index}`;
    const product = {
      ...structuredClone(template),
      id,
      slug: id,
      revision: 1,
      published: false,
      variants: template.variants.map((variant, position) => ({
        ...variant,
        id: `${id}-${position}`,
        sku: `${id}-${position}`,
      })),
    };
    await execute("INSERT INTO products(id,body) VALUES (?,?)", [
      id,
      JSON.stringify(product),
    ]);
    selection.push({ id, revision: 1 });
  }

  const published = await setPublished({
    products: selection,
    published: true,
  });
  assert.equal(published.length, 124);
  assert(
    published.every((product) => product.published && product.revision === 2),
  );

  const staleSelection = selection.map((item) => ({ ...item, revision: 2 }));
  staleSelection.at(-1)!.revision = 1;
  await assert.rejects(
    () => setPublished({ products: staleSelection, published: false }),
    /mudou/,
  );
  for (const { id } of selection) {
    const product = (await getProduct(id))!;
    assert.equal(product.published, true);
    assert.equal(product.revision, 2);
  }
});

test("available offer pricing excludes sold-out variants and includes active promotions", async () => {
  const template = (await getProducts())[0];
  const variant = template.variants[0];
  const product = {
    ...template,
    variants: [
      { ...variant, id: "sold-out", stock: 0, priceCents: 10000 },
      { ...variant, id: "in-stock", stock: 1, priceCents: 30000 },
      {
        ...variant,
        id: "promotional-stock",
        stock: 1,
        priceCents: 40000,
        promotionPriceCents: 20000,
      },
    ],
  };
  const offer = lowestAvailablePricedVariant(product);
  assert.equal(offer.id, "promotional-stock");
  assert.equal(sellingPrice(offer), 20000);
  const soldOut = {
    ...product,
    variants: product.variants.map((item) => ({ ...item, stock: 0 })),
  };
  assert.equal(lowestAvailablePricedVariant(soldOut).id, "sold-out");
});

test("manufacturer identifiers validate checksum and reject reused GTINs atomically", async () => {
  const template = (await getProducts())[0];
  const create = (id: string) => ({
    ...structuredClone(template),
    id,
    slug: id,
    revision: 0,
    published: false,
    verified: false,
    priceConfirmed: false,
    variants: [
      {
        ...template.variants[0],
        id: `${id}-variant`,
        sku: id,
        gtin: "4006381333931",
        mpn: "TEST-001",
      },
    ],
  });
  const first = await saveProduct(create("barcode-first"));
  await assert.rejects(
    () => saveProduct(create("barcode-second")),
    /código de barras único/,
  );
  assert.equal(await getProduct("barcode-second"), undefined);
  const invalid = structuredClone(first);
  invalid.variants[0].gtin = "4006381333932";
  assert(!productSchema.safeParse(invalid).success);
  assert.equal((await getProduct(first.id))?.revision, first.revision);
});
