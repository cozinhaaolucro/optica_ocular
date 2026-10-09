import "server-only";
import { z } from "zod";
import { getProducts, getProduct, saveProduct } from "./catalog";
import { query, transaction, audit } from "./persistence";
import { canSell } from "./product";
import { listOrders, adminOrder } from "./orders";
import { storageConfigured } from "./media";
import { usesPostgres } from "./storage-mode";

export async function dashboard() {
  const products = await getProducts(true);
  const orders = (await listOrders()).map(adminOrder);
  const events = await query<{
    id: number;
    type: string;
    body: string;
    created: string;
  }>(
    "SELECT id,type,body,created FROM events WHERE type<>? ORDER BY id DESC LIMIT 50",
    ["telemetry"],
  );
  return {
    products,
    orders,
    activity: events.map((event) => ({
      ...event,
      body: JSON.parse(event.body),
    })),
    config: {
      database: usesPostgres() ? "Supabase · PostgreSQL" : "SQLite local",
      media: usesPostgres()
        ? storageConfigured()
          ? "Supabase Storage"
          : "Fotos: configuração pendente"
        : "Armazenamento local",
      storageReady: !usesPostgres() || storageConfigured(),
      published: products.filter((p) => p.published).length,
      validated: products.filter((p) => canSell({ ...p, published: true }))
        .length,
      paymentsEnabled: false,
      pickupEnabled: process.env.OCULAR_PICKUP_ENABLED !== "false",
      indexingEnabled: process.env.OCULAR_INDEXING_ENABLED === "true",
      telemetryEnabled: process.env.OCULAR_TELEMETRY_ENABLED === "true",
      siteUrl: process.env.OCULAR_SITE_URL || "http://localhost:3000",
    },
  };
}

export async function updateInventory(input: unknown) {
  const data = z
    .object({
      productId: z.string().max(100),
      variantId: z.string().max(120),
      revision: z.number().int().min(0),
      stock: z.number().int().min(0).max(100000),
      priceCents: z.number().int().min(1).max(10000000),
      promotionPriceCents: z
        .number()
        .int()
        .min(1)
        .max(10000000)
        .nullable()
        .optional(),
      reason: z.string().trim().min(3).max(300),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const product = await getProduct(data.productId);
    if (!product) throw new Error("Modelo não encontrado.");
    if (product.revision !== data.revision)
      throw new Error("Este estoque mudou. Atualize antes de salvar.");
    const variant = product.variants.find((v) => v.id === data.variantId);
    if (!variant) throw new Error("Variante não encontrada.");
    const previousStock = variant.stock;
    const previousPrice = variant.priceCents;
    const previousPromotionPrice = variant.promotionPriceCents ?? null;
    variant.stock = data.stock;
    variant.priceCents = data.priceCents;
    if (data.promotionPriceCents !== undefined)
      variant.promotionPriceCents = data.promotionPriceCents;
    const saved = await saveProduct(product);
    await audit("inventory_updated", {
      productId: product.id,
      name: product.name,
      sku: variant.sku,
      previousStock,
      stock: variant.stock,
      previousPrice,
      priceCents: variant.priceCents,
      previousPromotionPrice,
      promotionPriceCents: variant.promotionPriceCents ?? null,
      reason: data.reason,
    });
    return saved;
  });
}

export async function setPublished(input: unknown) {
  const data = z
    .object({
      products: z
        .array(
          z
            .object({
              id: z.string().max(100),
              revision: z.number().int().min(0),
            })
            .strict(),
        )
        .min(1)
        .max(250),
      published: z.boolean(),
    })
    .strict()
    .parse(input);
  if (new Set(data.products.map((p) => p.id)).size !== data.products.length)
    throw new Error("Modelos repetidos.");
  return transaction(async () => {
    const saved = [];
    for (const item of data.products) {
      const product = await getProduct(item.id);
      if (!product || product.revision !== item.revision)
        throw new Error("Um cadastro mudou. Atualize antes de salvar.");
      product.published = data.published;
      saved.push(await saveProduct(product));
    }
    await audit("catalog_visibility", {
      models: saved.length,
      published: data.published,
    });
    return saved;
  });
}
