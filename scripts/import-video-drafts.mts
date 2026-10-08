import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getProducts, productSchema, saveProduct } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { saveMedia } from "../src/lib/media";
import { usesPostgres } from "../src/lib/storage-mode";

// Local, owner-reviewed selection. Raw files and the upload ledger stay in ignored data/.
const root = resolve("data/video-import");
const selection = JSON.parse(
  await readFile(join(root, "selecao.json"), "utf8"),
) as {
  batch: string;
  items: {
    id: string;
    video: string;
    name: string;
    category: "grau" | "sol";
    brand: string;
    color: string;
    shape: string;
    description: string;
    features: string[];
    photos: [string, number][];
  }[];
};
const products = selection.items.map((item) =>
  productSchema.parse({
    revision: 0,
    id: item.id,
    slug: item.id,
    name: item.name,
    category: item.category,
    brand: item.brand,
    description: item.description,
    material: "",
    features: item.features,
    tags: [selection.batch, item.shape].filter(
      (tag) => tag !== "A identificar",
    ),
    images: [],
    published: false,
    verified: false,
    priceConfirmed: false,
    package: null,
    variants: [
      {
        id: `${item.id}-01`,
        sku: `OC-VID-20261008-${item.video.slice(1)}`,
        label: item.color,
        color: item.color,
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
if (new Set(products.map((p) => p.id)).size !== products.length)
  throw new Error("Identificadores repetidos na seleção.");

if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      drafts: products.length,
      published: 0,
      videos: selection.items.map((p) => p.video),
    }),
  );
  process.exit(0);
}
if (!usesPostgres())
  throw new Error("Esta importação exige o PostgreSQL configurado.");
const before = await getProducts(true);
await mkdir(root, { recursive: true });
const backup = join(
  root,
  `catalog-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
await writeFile(backup, JSON.stringify(before, null, 2));
const ledgerPath = join(root, "uploads.json");
let ledger: Record<string, string> = {};
try {
  ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const existing = new Set(before.map((p) => p.id));
for (const [i, product] of products.entries()) {
  if (existing.has(product.id)) continue;
  for (const [video, sample] of selection.items[i].photos) {
    const key = `${video}-${sample}`;
    if (!ledger[key]) {
      // These are original decoded frames encoded as WebP, without synthetic detail or enlargement.
      ledger[key] = await saveMedia(
        `${randomUUID()}.webp`,
        await readFile(join(root, "quadros", `${key}.webp`)),
      );
      await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
    }
    product.images.push(ledger[key]);
  }
}
const saved = await transaction(async () => {
  const current = new Set((await getProducts(true)).map((p) => p.id));
  const result = [];
  for (const product of products) {
    if (current.has(product.id)) continue; // Never overwrite an edited draft on a retry.
    result.push(await saveProduct(product));
  }
  return result;
});
const after = await getProducts(true);
await writeFile(
  join(root, "imported.json"),
  JSON.stringify(
    after.filter((p) => products.some((item) => item.id === p.id)),
    null,
    2,
  ),
);
for (const p of products) {
  const stored = after.find((item) => item.id === p.id);
  if (!stored) throw new Error("Um cadastro não foi persistido.");
  if (
    !existing.has(p.id) &&
    (stored.published ||
      stored.verified ||
      stored.priceConfirmed ||
      stored.variants.some((v) => v.priceCents !== 0 || v.stock !== 0))
  )
    throw new Error("O estado do rascunho importado está incorreto.");
}
console.log(
  JSON.stringify({
    created: saved.length,
    skipped: products.length - saved.length,
    total: after.length,
    publishedBefore: before.filter((p) => p.published).length,
    publishedAfter: after.filter((p) => p.published).length,
    backup,
  }),
);
process.exit(0);
