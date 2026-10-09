import { test } from "node:test";
import assert from "node:assert/strict";
import {
  productFeed,
  channelReport,
  catalogImageUrl,
  catalogImageMatches,
  feedItemId,
} from "../src/lib/marketing-feeds";
import { validGtin } from "../src/lib/product-identifiers";
import { selectVariant } from "../src/lib/product";
import type { Product } from "../src/lib/types";

const config = {
  siteUrl: "https://optica.example",
  paymentsEnabled: true,
  indexingEnabled: true,
};
function model(): Product {
  return {
    id: "test-model",
    revision: 1,
    slug: "test-model",
    category: "grau",
    name: "Modelo & Teste",
    brand: "Marca",
    description: "Armação preta com aro fechado.",
    descriptionSource: "generated",
    material: "Acetato",
    features: ["Aro fechado"],
    tags: [],
    images: ["/assets/front.webp", "/assets/side.webp", "/assets/detail.webp"],
    verified: true,
    priceConfirmed: true,
    published: true,
    package: null,
    variants: [
      {
        id: "black-50",
        sku: "SKU-1",
        gtin: "4006381333931",
        mpn: "MODELO-001",
        image: "/assets/front.webp",
        label: "Preto 50",
        color: "Preto",
        lensWidth: 50,
        bridge: 18,
        temple: 140,
        priceCents: 70000,
        promotionPriceCents: 60000,
        stock: 3,
      },
      {
        id: "brown-52",
        sku: "SKU-2",
        mpn: "MODELO-002",
        image: "/assets/side.webp",
        label: "Havana 52",
        color: "Havana",
        lensWidth: 52,
        bridge: 18,
        temple: 140,
        priceCents: 80000,
        stock: 0,
      },
    ],
  };
}
test("GTIN preserves leading zeros and validates lengths and checksum", () => {
  assert(validGtin("4006381333931"));
  assert(validGtin("04006381333931"));
  for (const value of [
    "4006381333932",
    "00000000",
    "400638133393",
    "40063813339310",
    "abc",
  ])
    assert(!validGtin(value), value);
});
test("feed includes variants, promotions, identifiers and matching landing links", () => {
  const product = model();
  const feed = productFeed([product], "google", config);
  assert.equal(feed.count, 2);
  assert(feed.content.includes("Modelo &amp; Teste"));
  assert(
    feed.content.includes(
      "<g:price>700.00 BRL</g:price><g:sale_price>600.00 BRL</g:sale_price>",
    ),
  );
  assert(feed.content.includes("?variant=black-50"));
  assert(feed.content.includes("?variant=brown-52"));
  assert(
    feed.content.includes("<g:availability>out_of_stock</g:availability>"),
  );
  assert(feed.content.includes("<g:gtin>4006381333931</g:gtin>"));
  assert(feed.content.includes("<g:structured_description>"));
  assert(feed.content.includes("trained_algorithmic_media"));
  assert(
    feed.content.includes(
      "<g:google_product_category>524</g:google_product_category>",
    ),
  );
  assert.equal(selectVariant(product, "brown-52").id, "brown-52");
  assert.equal(selectVariant(product, "not-found").id, "black-50");
});
test("hidden, unverified and quotation products never become advertising offers", () => {
  for (const patch of [
    { published: false },
    { verified: false },
    { priceConfirmed: false },
    { images: ["/assets/placeholders/frame.svg"] },
    { variants: [{ ...model().variants[0], priceCents: 0 }] },
  ]) {
    const p = { ...model(), ...patch };
    assert.equal(productFeed([p], "meta", config).count, 0);
    assert.equal(productFeed([p], "google", config).count, 0);
  }
});
test("Google export waits for online purchase and indexing; Meta keeps valid catalog data", () => {
  const product = model();
  const settings = {
    ...config,
    paymentsEnabled: false,
    indexingEnabled: false,
  };
  assert.equal(productFeed([product], "google", settings).count, 0);
  assert.equal(productFeed([product], "meta", settings).count, 2);
  assert.equal(channelReport([product], settings).channels.google.dataReady, 2);
  assert.equal(
    channelReport([product], settings).channels.google.blockers.length,
    2,
  );
});
test("missing manufacturer identifiers affect Google without fabricating an MPN or GTIN", () => {
  const product = model();
  product.variants = product.variants.map((v) => ({ ...v, gtin: "", mpn: "" }));
  assert.equal(productFeed([product], "google", config).count, 0);
  const meta = productFeed([product], "meta", config);
  assert.equal(meta.count, 2);
  assert(!meta.content.includes("<g:gtin>"));
  assert(!meta.content.includes("<g:mpn>"));
  assert(!meta.content.includes("identifier_exists"));
});
test("item IDs stay stable across edits and image URLs change when a photo changes", () => {
  const product = model();
  const id = feedItemId(product.id, product.variants[0].id);
  assert(id.length <= 50);
  assert.equal(id, feedItemId(product.id, product.variants[0].id));
  assert.notEqual(id, feedItemId(product.id, product.variants[1].id));
  const image = catalogImageUrl(config.siteUrl, product);
  const fingerprint = image.match(/-([a-f0-9]{12})\.jpg$/)![1];
  assert(catalogImageMatches(product, 0, fingerprint));
  product.images[0] = "/assets/updated.webp";
  assert.notEqual(catalogImageUrl(config.siteUrl, product), image);
  assert(!catalogImageMatches(product, 0, fingerprint));
  assert(!catalogImageMatches(product, 999, fingerprint));
});
test("XML escapes imported text, rejects unsafe image sources and exports only public data", () => {
  const product = model();
  product.description = 'Texto <script> & "teste" \u0000.';
  product.tags = ["nota-privada"];
  const feed = productFeed([product], "meta", config);
  assert(feed.content.includes("&lt;script&gt; &amp; &quot;teste&quot;"));
  assert(!feed.content.includes("\u0000"));
  assert(!feed.content.includes("nota-privada"));
  product.images[0] = "https://private.example/secret.jpg";
  assert.equal(productFeed([product], "meta", config).count, 0);
  assert.throws(() =>
    productFeed([model()], "meta", {
      ...config,
      siteUrl: "javascript:alert(1)",
    }),
  );
});
test("invalid barcodes are withheld from both channels", () => {
  const product = model();
  product.variants[0].gtin = "4006381333932";
  assert.equal(productFeed([product], "meta", config).count, 1);
  assert.equal(productFeed([product], "google", config).count, 1);
});
test("color variants require an associated photo and their feeds use that exact image", () => {
  const product = model();
  const content = productFeed([product], "meta", config).content;
  assert(content.includes(catalogImageUrl(config.siteUrl, product, 1)));
  assert(!content.includes("<g:additional_image_link>"));
  product.variants[1].image = "";
  assert.equal(productFeed([product], "meta", config).count, 0);
  assert(
    channelReport([product], config).models[0].variants[0].metaIssues.includes(
      "Fotografia de cada cor",
    ),
  );
});
