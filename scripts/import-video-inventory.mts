import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { getProducts, productSchema, saveProduct } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { usesPostgres } from "../src/lib/storage-mode";
import type { Product } from "../src/lib/types";
type InventoryPiece = {
  id: string;
  name: string;
  piece: string;
  video: string;
  shape: string;
  category: Product["category"];
  brand: string;
  description: string;
  material: string;
  features: string[];
  color: string;
};
const dir = "data/video-import/pesquisa/rodada6/";
const manifest = JSON.parse(
  await readFile(dir + "inventory-pending.json", "utf8"),
) as { batch: string; pieces: InventoryPiece[] };
const current = await getProducts(true);
const pending = manifest.pieces.filter(
  (p) => !current.some((x) => x.id === p.id),
);
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ pending: pending.length }));
  process.exit(0);
}
if (!usesPostgres()) throw new Error("PostgreSQL é necessário.");
await writeFile(
  dir + "catalog-before-inventory.json",
  JSON.stringify(current, null, 2),
);
const products = pending.map((x) =>
  productSchema.parse({
    revision: 0,
    id: x.id,
    slug: x.id,
    name: x.name,
    category: x.category,
    brand: x.brand,
    description: x.description,
    material: x.material,
    features: x.features,
    tags: [
      "videos-20261008",
      manifest.batch,
      "referencia-pendente",
      "agrupar-variantes",
      x.video,
      x.piece,
      x.shape,
      "conferir-referencia-fisica",
    ],
    images: [],
    verified: false,
    priceConfirmed: false,
    published: false,
    package: null,
    variants: [
      {
        id: x.id + "-1",
        sku: "OC-VID-" + x.piece.toUpperCase(),
        label: x.color,
        color: x.color,
        lensWidth: null,
        bridge: null,
        temple: null,
        priceCents: 0,
        promotionPriceCents: null,
        stock: 0,
      },
    ],
  }),
);
await transaction(async () => {
  for (const p of products) await saveProduct(p);
});
const after = await getProducts(true);
for (const old of current)
  if (
    JSON.stringify(old) !== JSON.stringify(after.find((x) => x.id === old.id))
  )
    throw new Error("Ficha anterior alterada: " + old.id);
const filmed = after.filter((p) => p.tags.includes("videos-20261008"));
if (
  filmed.length !== 50 ||
  filmed.some(
    (p) =>
      p.published ||
      p.verified ||
      p.priceConfirmed ||
      p.variants.some((v) => v.priceCents !== 0 || v.stock !== 0),
  )
)
  throw new Error("Lote não está no estado esperado.");
const result = {
  added: products.length,
  filmedDrafts: filmed.length,
  visualModels: 17,
  modelPending: 33,
  physicalCodesConfirmed: 0,
  total: after.length,
  published: after.filter((p) => p.published).length,
  previousRecordsPreserved: current.length,
  cataloguePhotos: filmed.reduce((n, p) => n + p.images.length, 0),
  withCataloguePhotos: filmed.filter((p) => p.images.length).length,
};
await writeFile(dir + "inventory-result.json", JSON.stringify(result, null, 2));
await writeFile(dir + "catalog-final.json", JSON.stringify(after, null, 2));
console.log(JSON.stringify(result));
process.exit(0);
