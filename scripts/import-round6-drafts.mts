import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { getProducts, saveProduct, productSchema } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { saveMedia } from "../src/lib/media";
import { usesPostgres } from "../src/lib/storage-mode";
import type { Product } from "../src/lib/types";
type RoundMatch = {
  piece: string;
  model: string;
  name: string;
  brand: string;
  video: string;
  category: Product["category"];
  description: string;
  material: string;
  features: string[];
  color: string;
  photos: { file: string; url: string; angle: string }[];
};
const dir = "data/video-import/pesquisa/rodada6/";
const m = JSON.parse(
  await readFile(dir + "manifesto-rodada6.json", "utf8"),
) as { batch: string; matches: RoundMatch[] };
const current = await getProducts(true);
const pending = m.matches.filter(
  (x) => !current.some((p) => p.id === "video-20261008-" + x.piece),
);
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ pending: pending.map((x) => x.model) }));
  process.exit(0);
}
if (!usesPostgres()) throw new Error("PostgreSQL é necessário.");
await writeFile(
  dir + "catalog-before-round6.json",
  JSON.stringify(current, null, 2),
);
let uploads: Record<
  string,
  { path: string; url: string; angle: string; sha256: string }
> = {};
try {
  uploads = JSON.parse(await readFile(dir + "uploads.json", "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const products: Product[] = [];
for (const x of pending) {
  const id = "video-20261008-" + x.piece;
  const images = [];
  for (const photo of x.photos) {
    const bytes = await readFile(photo.file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const key = id + ":" + hash;
    if (!uploads[key]) {
      uploads[key] = {
        path: await saveMedia(
          randomUUID() + ".webp",
          await sharp(bytes).webp({ quality: 95 }).toBuffer(),
        ),
        url: photo.url,
        angle: photo.angle,
        sha256: hash,
      };
      await writeFile(dir + "uploads.json", JSON.stringify(uploads, null, 2));
    }
    images.push(uploads[key].path);
  }
  products.push(
    productSchema.parse({
      revision: 0,
      id,
      slug: x.brand.toLowerCase() + "-" + x.model.toLowerCase() + "-video",
      name: x.name,
      category: x.category,
      brand: x.brand,
      description: x.description,
      material: x.material,
      features: x.features,
      tags: [
        "videos-20261008",
        "pesquisa-20261008",
        m.batch,
        x.video,
        x.model,
        "associacao-visual",
        "conferir-referencia-fisica",
        "conferir-cor-e-calibre",
      ],
      images,
      verified: false,
      priceConfirmed: false,
      published: false,
      package: null,
      variants: [
        {
          id: id + "-1",
          sku: "OC-VID-" + x.piece.toUpperCase() + "-1",
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
}
await transaction(async () => {
  for (const product of products) await saveProduct(product);
});
const after = await getProducts(true);
for (const p of current)
  if (JSON.stringify(p) !== JSON.stringify(after.find((x) => x.id === p.id)))
    throw new Error("Ficha anterior alterada.");
const result = {
  added: products.length,
  total: after.length,
  previousPreserved: current.length,
  filmedDrafts: after.filter((p) => p.tags.includes("videos-20261008")).length,
  visualModels: 17,
  published: after.filter((p) => p.published).length,
  storedPhotos: products.reduce((n, p) => n + p.images.length, 0),
};
await writeFile(dir + "import-result.json", JSON.stringify(result, null, 2));
await writeFile(
  dir + "catalog-after-round6.json",
  JSON.stringify(after, null, 2),
);
console.log(JSON.stringify(result));
process.exit(0);
