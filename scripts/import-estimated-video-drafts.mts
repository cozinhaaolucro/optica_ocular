import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { getProducts, saveProduct, productSchema } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { saveMedia } from "../src/lib/media";
import { usesPostgres } from "../src/lib/storage-mode";
import type { Product } from "../src/lib/types";

type Photo = { file: string; url: string; angle: string; source?: string };
type Match = {
  id: string;
  name: string;
  brand: string;
  model: string;
  confidence: string;
  photos: Photo[];
};
const dir = "data/video-import/pesquisa/estimativas/";
const manifest = JSON.parse(
  await readFile(dir + "manifesto-estimativas.json", "utf8"),
) as { batch: string; matches: Match[] };
const before = await getProducts(true);
const targets = new Set(manifest.matches.map((x) => x.id));
if (manifest.matches.length !== 33 || targets.size !== 33)
  throw new Error("Esperadas 33 referências estimadas.");
if (before.filter((p) => p.tags.includes("videos-20261008")).length !== 50)
  throw new Error("Esperadas 50 fichas dos vídeos.");
for (const x of manifest.matches) {
  const p = before.find((p) => p.id === x.id);
  if (
    !p ||
    !p.tags.includes("videos-20261008") ||
    p.published ||
    p.verified ||
    p.priceConfirmed
  )
    throw new Error("Ficha não elegível: " + x.id);
}
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      estimated: manifest.matches.length,
      photos: manifest.matches.reduce((n, x) => n + x.photos.length, 0),
      unchanged: before.length - targets.size,
    }),
  );
  process.exit(0);
}
if (!usesPostgres()) throw new Error("PostgreSQL necessário.");
try {
  await writeFile(
    dir + "catalog-before-estimates.json",
    JSON.stringify(before, null, 2),
    { flag: "wx" },
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
}
await writeFile(
  dir + "catalog-before-latest-apply.json",
  JSON.stringify(before, null, 2),
);
type Upload = {
  path: string;
  sha256: string;
  url: string;
  angle: string;
  source?: string;
};
let uploads: Record<string, Upload> = {};
try {
  uploads = JSON.parse(await readFile(dir + "uploads.json", "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const next: Product[] = [];
for (const x of manifest.matches) {
  const p = before.find((p) => p.id === x.id)!;
  const images: string[] = [];
  for (const photo of x.photos) {
    const bytes = await readFile(photo.file),
      hash = createHash("sha256").update(bytes).digest("hex");
    if (!uploads[hash]) {
      const webp = await sharp(bytes).webp({ quality: 95 }).toBuffer();
      if (webp.length > 4 * 1024 * 1024)
        throw new Error("Foto acima do limite.");
      uploads[hash] = {
        path: await saveMedia(randomUUID() + ".webp", webp),
        sha256: hash,
        url: photo.url,
        angle: photo.angle,
        source: photo.source,
      };
      await writeFile(dir + "uploads.json", JSON.stringify(uploads, null, 2));
    }
    images.push(uploads[hash].path);
  }
  const tags = [
    ...new Set([
      ...p.tags.filter(
        (t) =>
          ![
            "referencia-pendente",
            "confianca-baixa",
            "confianca-media",
            ...(x.id === "video-20261008-v01-f0630-l-r07" ? ["RA7192L"] : []),
          ].includes(t),
      ),
      manifest.batch,
      "referencia-estimada",
      x.confidence === "média" ? "confianca-media" : "confianca-baixa",
      x.model,
    ]),
  ];
  const candidate = productSchema.parse({
    ...p,
    name: x.name,
    brand: x.brand,
    tags,
    images,
  });
  if (JSON.stringify(candidate) !== JSON.stringify(p)) next.push(candidate);
}
await transaction(async () => {
  for (const p of next) await saveProduct(p);
});
const after = await getProducts(true);
if (before.length !== after.length) throw new Error("Número de fichas mudou.");
for (const p of before) {
  const q = after.find((q) => q.id === p.id)!;
  if (!targets.has(p.id) && JSON.stringify(p) !== JSON.stringify(q))
    throw new Error("Ficha fora do lote alterada.");
  if (targets.has(p.id))
    for (const field of [
      "variants",
      "published",
      "verified",
      "priceConfirmed",
      "category",
      "slug",
      "material",
      "features",
      "package",
      "description",
    ] as const)
      if (JSON.stringify(p[field]) !== JSON.stringify(q[field]))
        throw new Error("Campo preservado alterado: " + field);
}
const filmed = after.filter((p) => p.tags.includes("videos-20261008"));
const result = {
  updated: next.length,
  total: after.length,
  filmed: filmed.length,
  estimated: filmed.filter((p) => p.tags.includes("referencia-estimada"))
    .length,
  cataloguePhotos: filmed.reduce((n, p) => n + p.images.length, 0),
  withCataloguePhotos: filmed.filter((p) => p.images.length).length,
  galleries3: filmed.filter((p) => p.images.length >= 3).length,
  allHidden: filmed.every(
    (p) => !p.published && !p.verified && !p.priceConfirmed,
  ),
  otherRecordsPreserved: before.length - targets.size,
};
await writeFile(dir + "import-result.json", JSON.stringify(result, null, 2));
await writeFile(
  dir + "catalog-after-estimates.json",
  JSON.stringify(after, null, 2),
);
console.log(JSON.stringify(result));
process.exit(0);
