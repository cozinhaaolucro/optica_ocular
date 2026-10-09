import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { getProducts, productSchema, saveProduct } from "../src/lib/catalog";
import { transaction } from "../src/lib/persistence";
import { saveMedia } from "../src/lib/media";
import { usesPostgres } from "../src/lib/storage-mode";
import type { Product } from "../src/lib/types";

type Reference = {
  id: string;
  name: string;
  model: string;
  brand: string;
  category: "grau" | "sol";
  color: string;
  colorCode: string;
  material: string;
  dimensions: [number, number, number];
  sources: string[];
  pending: string[];
  gallery: { file: string; source: string; angle: string }[];
};
const dir = "data/video-import/expansao";
const batch = "primeira-leva-50-20261008";
const selection = JSON.parse(
  await readFile(`${dir}/selection.json`, "utf8"),
) as Reference[];
const videoBaseline = JSON.parse(
  await readFile("data/video-import/pesquisa/enriched.json", "utf8"),
) as Product[];
if (
  selection.length !== 41 ||
  new Set(selection.map((p) => `${p.brand}:${p.model}`)).size !== 41 ||
  videoBaseline.length !== 9
)
  throw new Error(
    "A seleção deve conter 41 modelos complementares e nove associados aos vídeos.",
  );
if (!usesPostgres())
  throw new Error("Esta importação exige PostgreSQL configurado.");
const before = await getProducts(true);
const products = selection.map((p) =>
  productSchema.parse({
    revision: 0,
    id: p.id,
    slug: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: `${p.category === "grau" ? "Armação" : "Óculos de sol"} ${p.name.replace(p.brand + " ", "")}, da ${p.brand}, em ${p.material.toLowerCase()}, na cor ${p.color.toLowerCase()}. Referência de cor ${p.colorCode}.`,
    material: p.material,
    features: [],
    tags: [
      batch,
      "selecao-complementar-20261008",
      "pesquisa-20261008",
      p.model,
      p.colorCode,
      "conferir-disponibilidade",
    ],
    images: [],
    published: false,
    verified: false,
    priceConfirmed: false,
    package: null,
    variants: [
      {
        id: `${p.id}-01`,
        sku: `OC-SEL-20261008-${p.model.replaceAll(" ", "-")}`,
        label: `${p.color} · ${p.colorCode} · ${p.dimensions[0]} mm`,
        color: p.color,
        lensWidth: p.dimensions[0],
        bridge: p.dimensions[1],
        temple: p.dimensions[2],
        priceCents: 0,
        promotionPriceCents: null,
        stock: 0,
      },
    ],
  }),
);
const pending = products.filter((p) => !before.some((x) => x.id === p.id));
for (const p of products) {
  const existing = before.find((x) => x.id === p.id);
  if (existing && !existing.tags.includes("selecao-complementar-20261008"))
    throw new Error(`Identificador já usado: ${p.id}`);
}
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      pending: pending.length,
      alreadyImported: products.length - pending.length,
      photos: selection.reduce((n, p) => n + p.gallery.length, 0),
      proposals: 50,
    }),
  );
  process.exit(0);
}
await writeFile(
  `${dir}/catalog-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  JSON.stringify(before, null, 2),
);
const ledgerFile = `${dir}/uploads.json`;
let ledger: Record<string, { path: string; source: string; sha256: string }> =
  {};
try {
  ledger = JSON.parse(await readFile(ledgerFile, "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
for (const p of pending) {
  const reference = selection.find((x) => x.id === p.id)!;
  for (const photo of reference.gallery) {
    const bytes = await readFile(photo.file);
    if (bytes.length > 4 * 1024 * 1024)
      throw new Error("Foto excede o limite de mídia.");
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (!ledger[hash]) {
      ledger[hash] = {
        path: await saveMedia(`${randomUUID()}.webp`, bytes),
        source: photo.source,
        sha256: hash,
      };
      await writeFile(ledgerFile, JSON.stringify(ledger, null, 2));
    }
    p.images.push(ledger[hash].path);
  }
}
const result = await transaction(async () => {
  const current = await getProducts(true);
  const saved: Product[] = [];
  for (const p of pending) {
    if (current.some((x) => x.id === p.id)) continue;
    saved.push(await saveProduct(p));
  }
  for (const baseline of videoBaseline) {
    const p = current.find((x) => x.id === baseline.id);
    if (!p || p.published || p.verified || p.priceConfirmed)
      throw new Error("Uma ficha de vídeo mudou de estado; confira a seleção.");
    if (!p.tags.includes(batch))
      await saveProduct({ ...p, tags: [...p.tags, batch] });
  }
  return saved;
});
const after = await getProducts(true);
for (const old of before) {
  const now = after.find((x) => x.id === old.id)!;
  if (
    !videoBaseline.some((x) => x.id === old.id) &&
    JSON.stringify(now) !== JSON.stringify(old)
  )
    throw new Error("Um produto anterior mudou durante a importação.");
}
const proposal = after.filter((p) => p.tags.includes(batch));
if (proposal.length !== 50)
  throw new Error("A proposta não contém 50 modelos.");
for (const p of result)
  if (
    p.published ||
    p.verified ||
    p.priceConfirmed ||
    p.variants.some((v) => v.stock !== 0 || v.priceCents !== 0)
  )
    throw new Error("Estado comercial incorreto.");
await writeFile(
  `${dir}/imported.json`,
  JSON.stringify(
    after.filter((p) => products.some((x) => x.id === p.id)),
    null,
    2,
  ),
);
await writeFile(`${dir}/proposal.json`, JSON.stringify(proposal, null, 2));
await writeFile(
  "data/video-import/pesquisa/enriched.json",
  JSON.stringify(
    after.filter((p) => videoBaseline.some((x) => x.id === p.id)),
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    created: result.length,
    total: after.length,
    proposal: proposal.length,
    publishedBefore: before.filter((p) => p.published).length,
    publishedAfter: after.filter((p) => p.published).length,
  }),
);
process.exit(0);
