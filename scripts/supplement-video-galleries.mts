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
const dir = "data/video-import/pesquisa/estimativas/";
const m = JSON.parse(
  await readFile(dir + "galerias-complementares.json", "utf8"),
) as { matches: { id: string; photos: Photo[]; finishEstimated?: boolean }[] };
const before = await getProducts(true),
  target = new Set(m.matches.map((x) => x.id));
if (m.matches.length !== 5 || target.size !== 5 || !usesPostgres())
  throw new Error("Lote inválido.");
for (const x of m.matches) {
  const p = before.find((p) => p.id === x.id);
  if (
    !p ||
    !p.tags.includes("videos-20261008") ||
    p.published ||
    p.verified ||
    p.priceConfirmed
  )
    throw new Error("Ficha não elegível.");
}
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ galleries: 5 }));
  process.exit(0);
}
await writeFile(
  dir + "catalog-before-supplements.json",
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
  uploads = JSON.parse(
    await readFile(dir + "uploads-complementares.json", "utf8"),
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const existing = (
  await Promise.all(
    [
      "data/video-import/pesquisa/uploads.json",
      "data/video-import/pesquisa/avancada/uploads-lens.json",
      "data/video-import/pesquisa/rodada6/uploads.json",
    ].map(async (f) => Object.values(JSON.parse(await readFile(f, "utf8")))),
  )
).flat() as Upload[];
const next: Product[] = [];
for (const x of m.matches) {
  const p = before.find((p) => p.id === x.id)!,
    images: string[] = [];
  for (const photo of x.photos) {
    const bytes = await readFile(photo.file),
      hash = createHash("sha256").update(bytes).digest("hex");
    if (!uploads[hash]) {
      const prior = existing.find(
        (u) => u.sha256 === hash && u.url === photo.url,
      );
      const path =
        prior?.path ||
        (await saveMedia(
          randomUUID() + ".webp",
          await sharp(bytes).webp({ quality: 95 }).toBuffer(),
        ));
      uploads[hash] = {
        path,
        sha256: hash,
        url: photo.url,
        angle: photo.angle,
        source: photo.source,
      };
      await writeFile(
        dir + "uploads-complementares.json",
        JSON.stringify(uploads, null, 2),
      );
    }
    images.push(uploads[hash].path);
  }
  const candidate = productSchema.parse({
    ...p,
    images,
    tags: [
      ...new Set([
        ...p.tags,
        "galeria-20261009",
        ...(x.finishEstimated ? ["acabamento-estimado"] : []),
      ]),
    ],
  });
  if (JSON.stringify(p) !== JSON.stringify(candidate)) next.push(candidate);
}
await transaction(async () => {
  for (const p of next) await saveProduct(p);
});
const after = await getProducts(true);
for (const p of before) {
  const q = after.find((q) => q.id === p.id)!;
  if (!target.has(p.id) && JSON.stringify(p) !== JSON.stringify(q))
    throw new Error("Ficha fora do lote alterada.");
  if (target.has(p.id)) {
    for (const field of Object.keys(p) as (keyof Product)[]) {
      if (
        !["images", "tags", "revision"].includes(field) &&
        JSON.stringify(p[field]) !== JSON.stringify(q[field])
      )
        throw new Error("Outro campo alterado: " + field);
    }
  }
}
await writeFile(
  dir + "catalog-after-estimates.json",
  JSON.stringify(after, null, 2),
);
const filmed = after.filter((p) => p.tags.includes("videos-20261008"));
const result = {
  updated: next.length,
  filmed: filmed.length,
  estimated: filmed.filter((p) => p.tags.includes("referencia-estimada"))
    .length,
  cataloguePhotos: filmed.reduce((n, p) => n + p.images.length, 0),
  withCataloguePhotos: filmed.filter((p) => p.images.length).length,
  galleries3: filmed.filter((p) => p.images.length === 3).length,
  total: after.length,
  published: after.filter((p) => p.published).length,
};
await writeFile(dir + "final-result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
process.exit(0);
