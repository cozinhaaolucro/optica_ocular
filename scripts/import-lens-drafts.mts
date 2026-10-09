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
  piece: string;
  video: string;
  model: string;
  name: string;
  category: "grau" | "sol";
  material: string;
  description: string;
  features: string[];
  colors: string[];
  association: string;
  physicalReferenceConfirmed: boolean;
  photos: { file: string; url: string; angle: string; role: string }[];
};
const folder = "data/video-import/pesquisa/avancada/";
const manifest = JSON.parse(
  await readFile(folder + "manifesto-lens.json", "utf8"),
) as { batch: string; matches: Match[] };
const baseline = await getProducts(true);
const id = (m: Match) => `video-20261008-${m.piece}`;
if (new Set(manifest.matches.map(id)).size !== manifest.matches.length)
  throw new Error("Peças duplicadas.");
if (
  manifest.matches.some(
    (m) => m.association !== "visual-supported" || m.physicalReferenceConfirmed,
  )
)
  throw new Error("Estado da pesquisa inválido.");
const pending = manifest.matches.filter(
  (m) => !baseline.some((p) => p.id === id(m)),
);
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      pending: pending.map((m) => m.model),
      alreadyPresent: manifest.matches.length - pending.length,
    }),
  );
  process.exit(0);
}
if (!usesPostgres()) throw new Error("Este lote exige PostgreSQL.");
await writeFile(
  folder +
    `catalog-before-apply-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  JSON.stringify(baseline, null, 2),
);
const ledgerFile = folder + "uploads-lens.json";
let ledger: Record<
  string,
  { path: string; url: string; angle: string; sha256: string }
> = {};
try {
  ledger = JSON.parse(await readFile(ledgerFile, "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const additions: Product[] = [];
for (const m of pending) {
  const images: string[] = [];
  for (const photo of m.photos.filter((p) => p.role === "gallery")) {
    const original = await readFile(photo.file);
    const sha256 = createHash("sha256").update(original).digest("hex");
    const key = `${id(m)}:${sha256}`;
    if (!ledger[key]) {
      const bytes = await sharp(original).webp({ quality: 95 }).toBuffer();
      if (bytes.length > 4 * 1024 * 1024)
        throw new Error("Imagem excede o limite.");
      ledger[key] = {
        path: await saveMedia(`${randomUUID()}.webp`, bytes),
        url: photo.url,
        angle: photo.angle,
        sha256,
      };
      await writeFile(ledgerFile, JSON.stringify(ledger, null, 2));
    }
    images.push(ledger[key].path);
  }
  additions.push(
    productSchema.parse({
      revision: 0,
      id: id(m),
      slug: `ray-ban-${m.model.toLowerCase()}-video`,
      name: m.name,
      category: m.category,
      brand: "Ray-Ban",
      description: m.description,
      material: m.material,
      features: m.features,
      tags: [
        "videos-20261008",
        "pesquisa-20261008",
        manifest.batch,
        m.video,
        m.model,
        "associacao-visual",
        "conferir-referencia-fisica",
        "conferir-cor-e-calibre",
      ],
      images,
      verified: false,
      priceConfirmed: false,
      published: false,
      package: null,
      variants: m.colors.map((color, index) => ({
        id: `${id(m)}-${index + 1}`,
        sku: `OC-VID-${m.piece.toUpperCase()}-${index + 1}`,
        label: color,
        color,
        lensWidth: null,
        bridge: null,
        temple: null,
        priceCents: 0,
        promotionPriceCents: null,
        stock: 0,
      })),
    }),
  );
}
await transaction(async () => {
  const now = await getProducts(true);
  for (const m of pending) {
    if (now.some((p) => p.id === id(m)))
      throw new Error("Peça cadastrada durante a operação.");
  }
  for (const product of additions) await saveProduct(product);
});
const after = await getProducts(true);
for (const old of baseline) {
  if (
    JSON.stringify(old) !== JSON.stringify(after.find((p) => p.id === old.id))
  )
    throw new Error(`Produto anterior alterado: ${old.id}`);
}
for (const m of manifest.matches) {
  const p = after.find((x) => x.id === id(m));
  if (
    !p ||
    p.published ||
    p.verified ||
    p.priceConfirmed ||
    p.variants.some(
      (v) =>
        v.stock !== 0 ||
        v.priceCents !== 0 ||
        v.lensWidth !== null ||
        v.bridge !== null ||
        v.temple !== null,
    ) ||
    !p.images.length
  )
    throw new Error("Rascunho não está no estado previsto.");
}
const result = {
  added: additions.length,
  previousRecordsPreserved: baseline.length,
  total: after.length,
  published: after.filter((p) => p.published).length,
  actualVisualMatches: manifest.matches.length + 10,
  observedFinishes: manifest.matches.reduce((n, m) => n + m.colors.length, 0),
  storedImages: additions.reduce((n, p) => n + p.images.length, 0),
};
await writeFile(folder + "import-result.json", JSON.stringify(result, null, 2));
await writeFile(
  folder + "catalog-after-lens.json",
  JSON.stringify(after, null, 2),
);
console.log(JSON.stringify(result));
process.exit(0);
