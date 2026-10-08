import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import reference from "../../public/assets/lentes-data.json";
import { query, execute, transaction, audit } from "./persistence";
import { isCatalogPreview } from "./storage-mode";
import { matchesLensFilter, type LensRow } from "./lens-management";
export type { LensRow } from "./lens-management";

type LensConfig = {
  m?: string;
  i?: string;
  t: string;
  p: number;
  e?: string;
  regularPrice?: number;
};
type LensData = Record<
  string,
  Record<string, Record<string, Record<string, LensConfig[]>>>
>;
type Overrides = {
  revision: number;
  prices: Record<string, number>;
  promotions: Record<string, number>;
  disabled: Record<string, boolean>;
};

function eachLens(
  visit: (id: string, config: LensConfig, row: LensRow) => void,
) {
  for (const [brand, categories] of Object.entries(reference as LensData))
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
              promotionPriceCents: null,
              enabled: true,
            });
          });
}

async function overrides(): Promise<Overrides> {
  const empty: Overrides = {
    revision: 0,
    prices: {},
    promotions: {},
    disabled: {},
  };
  if (isCatalogPreview()) return empty;
  const [record] = await query<{ body: string }>(
    "SELECT body FROM settings WHERE key=?",
    ["lens-prices"],
  );
  return record ? { ...empty, ...JSON.parse(record.body) } : empty;
}
function rowsWithOverrides(current: Overrides) {
  const rows: LensRow[] = [];
  eachLens((id, _config, row) =>
    rows.push({
      ...row,
      priceCents: current.prices[id] ?? row.priceCents,
      promotionPriceCents: current.promotions[id] ?? null,
      enabled: current.disabled[id] !== true,
    }),
  );
  return rows;
}
export async function getLenses() {
  const current = await overrides();
  return { revision: current.revision, rows: rowsWithOverrides(current) };
}
export async function getLensData() {
  const current = await overrides();
  const data: LensData = {};
  // IDs always come from the original positions, before any configuration is hidden.
  eachLens((id, config, row) => {
    if (current.disabled[id]) return;
    const price = current.prices[id] ?? row.priceCents;
    const promotion = current.promotions[id];
    const publicConfig = {
      ...config,
      p: (promotion ?? price) / 100,
      ...(promotion !== undefined ? { regularPrice: price / 100 } : {}),
    };
    const categories = (data[row.brand] ??= {});
    const lines = (categories[row.category] ??= {});
    const options = (lines[row.line] ??= {});
    (options[row.option] ??= []).push(publicConfig);
  });
  return data;
}

const priceSchema = z.number().int().min(1).max(10000000);
const changeSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/),
    priceCents: priceSchema.optional(),
    promotionPriceCents: priceSchema.nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (c) =>
      c.priceCents !== undefined ||
      c.promotionPriceCents !== undefined ||
      c.enabled !== undefined,
    "Informe a alteração da configuração.",
  );
type Change = z.infer<typeof changeSchema>;

async function persistChanges(
  current: Overrides,
  changes: Change[],
  scope?: string,
) {
  const rows = new Map(rowsWithOverrides(current).map((row) => [row.id, row]));
  if (
    new Set(changes.map((c) => c.id)).size !== changes.length ||
    changes.some((c) => !rows.has(c.id))
  )
    throw new Error("Uma configuração de lente é inválida ou repetida.");
  for (const change of changes) {
    const row = rows.get(change.id)!;
    const price = change.priceCents ?? row.priceCents;
    const promotion =
      change.promotionPriceCents === undefined
        ? row.promotionPriceCents
        : change.promotionPriceCents;
    if (promotion !== null && (promotion <= 0 || promotion >= price))
      throw new Error(
        `O preço promocional de ${row.line} deve ser menor que o preço normal. Ajuste ou encerre a promoção antes de reduzir o preço normal.`,
      );
    if (change.priceCents !== undefined)
      current.prices[change.id] = change.priceCents;
    if (change.promotionPriceCents === null)
      delete current.promotions[change.id];
    else if (change.promotionPriceCents !== undefined)
      current.promotions[change.id] = change.promotionPriceCents;
    if (change.enabled === true) delete current.disabled[change.id];
    else if (change.enabled === false) current.disabled[change.id] = true;
  }
  current.revision++;
  await execute(
    "INSERT INTO settings(key,body) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body",
    ["lens-prices", JSON.stringify(current)],
  );
  await audit("lens_prices_updated", {
    configurations: changes.length,
    visibilityChanges: changes.filter((c) => c.enabled !== undefined).length,
    promotionChanges: changes.filter((c) => c.promotionPriceCents !== undefined)
      .length,
    ...(scope ? { scope } : {}),
  });
  return { revision: current.revision, count: changes.length };
}
function checkRevision(current: Overrides, revision: number) {
  if (current.revision !== revision)
    throw new Error("A tabela mudou. Atualize os valores antes de salvar.");
}
export async function saveLensPrices(input: unknown) {
  const data = z
    .object({
      revision: z.number().int().min(0),
      changes: z.array(changeSchema).min(1).max(1000),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const current = await overrides();
    checkRevision(current, data.revision);
    return persistChanges(current, data.changes);
  });
}
export async function updateLensGroup(input: unknown) {
  const data = z
    .object({
      revision: z.number().int().min(0),
      expectedCount: z.number().int().min(1).max(100000),
      filter: z
        .object({
          brand: z.string().max(200).optional(),
          category: z.string().max(200).optional(),
          line: z.string().max(300).optional(),
          query: z.string().max(300).optional(),
          status: z.enum(["all", "active", "hidden", "promotion"]).optional(),
        })
        .strict(),
      action: z.discriminatedUnion("type", [
        z
          .object({ type: z.literal("visibility"), enabled: z.boolean() })
          .strict(),
        z
          .object({
            type: z.literal("promotion"),
            percent: z.number().min(0.1).max(99).nullable(),
          })
          .strict(),
        z
          .object({
            type: z.literal("adjust"),
            percent: z.number().min(-99).max(200),
          })
          .strict(),
      ]),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const current = await overrides();
    checkRevision(current, data.revision);
    const rows = rowsWithOverrides(current).filter((row) =>
      matchesLensFilter(row, data.filter),
    );
    if (!rows.length || rows.length !== data.expectedCount)
      throw new Error(
        "Os resultados mudaram. Atualize a tabela e confira o filtro.",
      );
    const changes: Change[] = rows.map((row) => {
      const action = data.action;
      if (action.type === "visibility")
        return { id: row.id, enabled: action.enabled };
      if (action.type === "promotion")
        return {
          id: row.id,
          promotionPriceCents:
            action.percent === null
              ? null
              : Math.round(row.priceCents * (1 - action.percent / 100)),
        };
      return {
        id: row.id,
        priceCents: Math.round(row.priceCents * (1 + action.percent / 100)),
      };
    });
    changes.forEach((c) => changeSchema.parse(c));
    return persistChanges(current, changes, data.action.type);
  });
}
