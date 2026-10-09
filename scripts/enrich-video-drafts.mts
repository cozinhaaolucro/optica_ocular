import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import sharp from "sharp";
import { getProducts, productSchema, saveProduct } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { saveMedia } from "../src/lib/media";
import { usesPostgres } from "../src/lib/storage-mode";
import type { Product } from "../src/lib/types";

type Match = {
  video: string;
  model: string;
  name: string;
  colorCode: string;
  color: string;
  material: string;
  measurements: [number | null, number | null, number | null];
  description: string;
  features: string[];
  photos: { file: string; url: string; angle: string }[];
  preserveOriginalImages?: boolean;
};
const root = "data/video-import";
const manifest = JSON.parse(
  await readFile(`${root}/pesquisa/manifesto.json`, "utf8"),
) as { batch: string; matches: Match[] };
const baseline = JSON.parse(
  await readFile(`${root}/imported.json`, "utf8"),
) as Product[];
if (
  new Set(manifest.matches.map((m) => m.video)).size !== manifest.matches.length
)
  throw new Error("Referências repetidas no manifesto.");
const current = await getProducts(true);
const pending = manifest.matches.filter((match) => {
  const id = `video-20261008-${match.video}`;
  const product = current.find((p) => p.id === id);
  if (!product) throw new Error(`Rascunho ausente: ${id}`);
  if (product.tags.includes(manifest.batch)) return false;
  const original = baseline.find((p) => p.id === id);
  if (!original || JSON.stringify(original) !== JSON.stringify(product))
    throw new Error(`Rascunho editado desde a importação: ${id}`);
  if (
    product.published ||
    product.verified ||
    product.priceConfirmed ||
    product.variants.length !== 1 ||
    product.variants.some((v) => v.priceCents !== 0 || v.stock !== 0)
  )
    throw new Error(`O produto não é um rascunho sem dados comerciais: ${id}`);
  return true;
});
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      pending: pending.length,
      alreadyEnriched: manifest.matches.length - pending.length,
      models: pending.map((m) => m.model),
    }),
  );
  process.exit(0);
}
if (!usesPostgres())
  throw new Error("Enriquecimento exige PostgreSQL configurado.");
await writeFile(
  `${root}/catalog-before-research-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  JSON.stringify(current, null, 2),
);
const ledgerFile = `${root}/pesquisa/uploads.json`;
let ledger: Record<
  string,
  { path: string; source: string; angle: string; sha256: string }
> = {};
try {
  ledger = JSON.parse(await readFile(ledgerFile, "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const replacements: Product[] = [];
for (const match of pending) {
  const old = current.find((p) => p.id === `video-20261008-${match.video}`)!;
  // Keep filmed images when the model matches but the colour variant is unresolved.
  const images: string[] = match.preserveOriginalImages ? [...old.images] : [];
  for (const photo of match.photos) {
    const original = await readFile(photo.file);
    const sha256 = createHash("sha256").update(original).digest("hex");
    const key = `${old.id}:${sha256}`;
    if (!ledger[key]) {
      // Preserve the source photograph and transparency; only encode for storage.
      const bytes = await sharp(original).webp({ quality: 95 }).toBuffer();
      if (bytes.length > 4 * 1024 * 1024)
        throw new Error("Foto excede o limite de mídia.");
      ledger[key] = {
        path: await saveMedia(`${randomUUID()}.webp`, bytes),
        source: photo.url,
        angle: photo.angle,
        sha256,
      };
      await writeFile(ledgerFile, JSON.stringify(ledger, null, 2));
    }
    images.push(ledger[key].path);
  }
  replacements.push(
    productSchema.parse({
      ...old,
      name: match.name,
      description: match.description,
      material: match.material,
      features: match.features,
      images,
      tags: [
        ...new Set(
          [
            ...old.tags,
            manifest.batch,
            match.model,
            match.colorCode,
            "conferir-referencia-fisica",
          ].filter(Boolean),
        ),
      ],
      variants: old.variants.map((v) => ({
        ...v,
        label: match.color,
        color: match.color,
        lensWidth: match.measurements[0],
        bridge: match.measurements[1],
        temple: match.measurements[2],
      })),
    }),
  );
}
await transaction(async () => {
  for (const product of replacements) await saveProduct(product);
});
const after = await getProducts(true);
for (const product of replacements) {
  const stored = after.find((p) => p.id === product.id);
  if (
    !stored ||
    stored.revision !== product.revision + 1 ||
    stored.name !== product.name ||
    JSON.stringify(stored.images) !== JSON.stringify(product.images) ||
    stored.published ||
    stored.verified ||
    stored.priceConfirmed ||
    stored.variants.some((v) => v.stock !== 0 || v.priceCents !== 0)
  )
    throw new Error("Estado persistido difere do enriquecimento autorizado.");
}
if (
  current.filter((p) => p.published).length !==
  after.filter((p) => p.published).length
)
  throw new Error("A quantidade de produtos publicados mudou.");
await writeFile(
  `${root}/pesquisa/enriched.json`,
  JSON.stringify(
    after.filter((p) =>
      manifest.matches.some((m) => p.id === `video-20261008-${m.video}`),
    ),
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    enriched: replacements.length,
    skipped: manifest.matches.length - replacements.length,
    total: after.length,
    published: after.filter((p) => p.published).length,
    externalPhotos: pending.reduce((n, m) => n + m.photos.length, 0),
    storedImages: replacements.reduce((n, p) => n + p.images.length, 0),
  }),
);
process.exit(0);
