import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import reference from "../../public/assets/lentes-data.json";
import { query, execute, transaction, audit } from "./persistence";
import { isCatalogPreview } from "./storage-mode";

type LensConfig = { m?: string; i?: string; t: string; p: number; e?: string };
type LensData = Record<
  string,
  Record<string, Record<string, Record<string, LensConfig[]>>>
>;
export interface LensRow {
  id: string;
  brand: string;
  category: string;
  line: string;
  option: string;
  material: string;
  index: string;
  treatment: string;
  priceCents: number;
}
type Overrides = { revision: number; prices: Record<string, number> };

function eachLens(
  data: LensData,
  visit: (id: string, config: LensConfig, row: LensRow) => void,
) {
  for (const [brand, categories] of Object.entries(data))
    for (const [category, lines] of Object.entries(categories))
      for (const [line, options] of Object.entries(lines))
        for (const [option, configs] of Object.entries(options))
          configs.forEach((config, position) => {
            const id = createHash("sha256")
              .update(
                JSON.stringify([
                  brand,
                  category,
                  line,
                  option,
                  position,
                  config.m,
                  config.i,
                  config.t,
                ]),
              )
              .digest("hex")
              .slice(0, 24);
            visit(id, config, {
              id,
              brand,
              category,
              line,
              option,
              material: config.m || "Não informado",
              index: config.i || "",
              treatment: config.t,
              priceCents: Math.round(config.p * 100),
            });
          });
}

async function overrides(): Promise<Overrides> {
  if (isCatalogPreview()) return { revision: 0, prices: {} };
  const [record] = await query<{ body: string }>(
    "SELECT body FROM settings WHERE key=?",
    ["lens-prices"],
  );
  return record ? JSON.parse(record.body) : { revision: 0, prices: {} };
}

export async function getLenses() {
  const prices = await overrides();
  const rows: LensRow[] = [];
  eachLens(reference as LensData, (id, _config, row) =>
    rows.push({ ...row, priceCents: prices.prices[id] ?? row.priceCents }),
  );
  return { revision: prices.revision, rows };
}

export async function getLensData() {
  const prices = await overrides();
  const data = structuredClone(reference) as LensData;
  eachLens(data, (id, config) => {
    if (prices.prices[id] !== undefined) config.p = prices.prices[id] / 100;
  });
  return data;
}

export async function saveLensPrices(input: unknown) {
  const data = z
    .object({
      revision: z.number().int().min(0),
      changes: z
        .array(
          z
            .object({
              id: z.string().regex(/^[a-f0-9]{24}$/),
              priceCents: z.number().int().min(1).max(10000000),
            })
            .strict(),
        )
        .min(1)
        .max(1000),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const current = await overrides();
    if (current.revision !== data.revision)
      throw new Error("A tabela mudou. Atualize os valores antes de salvar.");
    const valid = new Set<string>();
    eachLens(reference as LensData, (id) => {
      valid.add(id);
    });
    if (
      data.changes.some((row) => !valid.has(row.id)) ||
      new Set(data.changes.map((row) => row.id)).size !== data.changes.length
    )
      throw new Error("Uma configuração de lente é inválida ou repetida.");
    for (const change of data.changes)
      current.prices[change.id] = change.priceCents;
    current.revision++;
    await execute(
      "INSERT INTO settings(key,body) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body",
      ["lens-prices", JSON.stringify(current)],
    );
    await audit("lens_prices_updated", { configurations: data.changes.length });
    return { revision: current.revision };
  });
}
