import "server-only";
import { z } from "zod";
import { query, execute, audit, transaction } from "./persistence";
import { canSell, sellingPrice, variantImage } from "./product";
import { referenceProducts } from "./catalog-seed";
import { isCatalogPreview } from "./storage-mode";
import type { Product, CartLine, CartItem } from "./types";
import { validGtin } from "./product-identifiers";

export async function getProducts(includeDrafts = false): Promise<Product[]> {
  if (isCatalogPreview())
    return referenceProducts().sort((a, b) => a.id.localeCompare(b.id));
  return (
    await query<{ body: string }>("SELECT body FROM products ORDER BY id")
  )
    .map((row) => JSON.parse(row.body) as Product)
    .filter((p) => includeDrafts || p.published);
}
export async function getProduct(id: string): Promise<Product | undefined> {
  if (isCatalogPreview()) return referenceProducts().find((p) => p.id === id);
  const [row] = await query<{ body: string }>(
    "SELECT body FROM products WHERE id=?",
    [id],
  );
  return row ? JSON.parse(row.body) : undefined;
}
const localImage = z
  .string()
  .regex(/^\/(assets\/|api\/media\/)[a-zA-Z0-9_./-]+$/)
  .refine((v) => !v.includes(".."));
const dimension = z.number().int().min(1).max(250).nullable();
export const productSchema = z
  .object({
    revision: z.number().int().min(0),
    id: z.string().regex(/^[a-z0-9-]{3,100}$/),
    slug: z.string().regex(/^[a-z0-9-]{3,100}$/),
    name: z.string().trim().min(3).max(150),
    category: z.enum(["grau", "sol"]),
    brand: z.string().trim().min(1).max(80),
    description: z.string().trim().min(10).max(4000),
    descriptionSource: z.enum(["original", "generated"]).optional(),
    material: z.string().trim().max(120),
    features: z.array(z.string().max(200)).max(20),
    tags: z.array(z.string().max(50)).max(20),
    images: z.array(localImage).max(12),
    verified: z.boolean(),
    priceConfirmed: z.boolean(),
    published: z.boolean(),
    variants: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9-]{3,120}$/),
            sku: z.string().trim().max(80),
            gtin: z
              .string()
              .trim()
              .refine(
                (v) => !v || validGtin(v),
                "Confira o código de barras e o dígito verificador.",
              )
              .optional(),
            mpn: z.string().trim().max(70).optional(),
            image: localImage.or(z.literal("")).optional(),
            label: z.string().trim().min(1).max(120),
            color: z.string().trim().max(80),
            lensWidth: dimension,
            bridge: dimension,
            temple: dimension,
            priceCents: z.number().int().min(0).max(10000000),
            promotionPriceCents: z
              .number()
              .int()
              .min(1)
              .max(10000000)
              .nullable()
              .optional(),
            stock: z.number().int().min(0).max(100000),
          })
          .refine(
            (v) =>
              v.promotionPriceCents == null ||
              v.promotionPriceCents < v.priceCents,
            {
              path: ["promotionPriceCents"],
              message: "O preço promocional deve ser menor que o preço normal.",
            },
          ),
      )
      .min(1)
      .max(40),
    package: z
      .object({
        width: z.number().positive().max(200),
        height: z.number().positive().max(200),
        length: z.number().positive().max(200),
        weight: z.number().positive().max(50),
      })
      .nullable(),
  })
  .strict()
  .superRefine((p, ctx) => {
    p.variants.forEach((v, index) => {
      if (v.image && !p.images.includes(v.image))
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "image"],
          message: "Escolha uma fotografia cadastrada neste modelo.",
        });
    });
    if (p.priceConfirmed || p.verified) {
      p.variants.forEach((v, index) => {
        if (v.priceCents <= 0)
          ctx.addIssue({
            code: "custom",
            path: ["variants", index, "priceCents"],
            message:
              "Informe o preço antes de confirmar os valores ou validar o produto.",
          });
      });
    }
  });
export async function saveProduct(input: unknown) {
  return transaction(() => saveProductInTransaction(input));
}
async function saveProductInTransaction(input: unknown) {
  const p = productSchema.parse(input);
  const previous = await getProduct(p.id);
  if (previous && (previous.revision || 0) !== p.revision)
    throw new Error(
      "Este produto mudou desde que você o abriu. Atualize o cadastro antes de salvar.",
    );
  if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
    throw new Error("Variantes com identificadores repetidos.");
  const orders = await query<{ body: string }>("SELECT body FROM orders");
  const products = await getProducts(true);
  if (
    previous &&
    orders.some((row) => {
      const o = JSON.parse(row.body);
      return (
        o.reserved &&
        o.items.some(
          (item: { productId: string; variantId: string }) =>
            item.productId === p.id &&
            !p.variants.some((v) => v.id === item.variantId),
        )
      );
    })
  )
    throw new Error(
      "Não remova uma variante que tem estoque reservado em pedido.",
    );
  const skus = p.variants.map((v) => v.sku).filter(Boolean);
  if (
    new Set(skus).size !== skus.length ||
    products.some(
      (other) =>
        other.id !== p.id &&
        other.variants.some(
          (v) => v.sku && p.variants.some((variant) => variant.sku === v.sku),
        ),
    )
  )
    throw new Error("Cada variante deve ter um SKU único.");
  const gtins = p.variants.map((v) => v.gtin || "").filter(Boolean);
  if (
    new Set(gtins).size !== gtins.length ||
    products.some(
      (other) =>
        other.id !== p.id &&
        other.variants.some((v) => v.gtin && gtins.includes(v.gtin)),
    )
  )
    throw new Error("Cada variante deve ter um código de barras único.");
  if (p.verified && !canSell({ ...p, published: true }))
    throw new Error(
      "Complete fotos do modelo e das cores, material, SKU, cor, medidas e preço confirmado para validar o produto.",
    );
  if (
    products.some(
      (other) =>
        other.id !== p.id &&
        other.slug === p.slug &&
        other.category === p.category,
    )
  )
    throw new Error("Já existe um produto com este endereço.");
  p.revision = (previous?.revision || 0) + 1;
  await execute(
    "INSERT INTO products(id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
    [p.id, JSON.stringify(p)],
  );
  await audit("catalog_updated", { productId: p.id, name: p.name });
  return p;
}
export const linesSchema = z
  .array(
    z
      .object({
        productId: z.string().max(100),
        variantId: z.string().max(120),
        quantity: z.number().int().min(1).max(10),
      })
      .strict(),
  )
  .min(1)
  .max(30);
export async function resolveLines(
  input: unknown,
  selling = false,
): Promise<CartItem[]> {
  const lines: CartLine[] = linesSchema.parse(input);
  if (
    new Set(lines.map((l) => `${l.productId}:${l.variantId}`)).size !==
    lines.length
  )
    throw new Error("Itens repetidos no carrinho.");
  const items: CartItem[] = [];
  for (const line of lines) {
    const p = await getProduct(line.productId);
    const v = p?.variants.find((v) => v.id === line.variantId);
    if (!p?.published || !v)
      throw new Error("Um item do carrinho não está mais disponível.");
    if (selling && (!canSell(p) || v.stock < line.quantity))
      throw new Error(`Confira a disponibilidade de ${p.name}.`);
    items.push({
      ...line,
      name: p.name,
      brand: p.brand,
      slug: p.slug,
      category: p.category,
      variantLabel: v.label,
      priceCents: sellingPrice(v),
      image: variantImage(p, v),
      available: canSell(p) && v.stock >= line.quantity,
    });
  }
  return items;
}
