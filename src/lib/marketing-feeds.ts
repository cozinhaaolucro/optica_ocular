import "server-only";
import { createHash } from "node:crypto";
import { canSell, isOnPromotion, productHref, variantImage } from "./product";
import { productIssues } from "./admin-utils";
import { validGtin } from "./product-identifiers";
import type { Product, Variant } from "./types";

export type FeedChannel = "google" | "meta";
export type FeedSettings = {
  siteUrl: string;
  paymentsEnabled: boolean;
  indexingEnabled: boolean;
};
export type ChannelReport = ReturnType<typeof channelReport>;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const feedItemId = (productId: string, variantId: string) =>
  `ocular-${hash(JSON.stringify([productId, variantId])).slice(0, 40)}`;
const groupId = (productId: string) => `ocular-${hash(productId).slice(0, 40)}`;
const feedPaths = { google: "/feeds/google.xml", meta: "/feeds/meta.xml" };

function rootUrl(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Configure o domínio público da loja.");
  return url.origin;
}
export function catalogImageUrl(root: string, product: Product, index = 0) {
  return `${rootUrl(root)}/feeds/images/${product.id}-${index}-${hash(product.images[index]).slice(0, 12)}.jpg`;
}
export function catalogImageMatches(
  product: Product,
  index: number,
  fingerprint: string,
) {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < product.images.length &&
    hash(product.images[index]).slice(0, 12) === fingerprint
  );
}
export function isRealCatalogImage(image: string) {
  return (
    /^\/(?:assets\/|api\/media\/)[a-zA-Z0-9_./-]+$/.test(image) &&
    !image.includes("..") &&
    !image.includes("/placeholders/")
  );
}
function variantIssues(product: Product, variant: Variant) {
  const issues = productIssues(product);
  if (!product.images.length || !product.images.every(isRealCatalogImage))
    issues.push("Fotografias do produto");
  if (!Number.isInteger(variant.priceCents) || variant.priceCents <= 0)
    issues.push("Preço da variante");
  if (!Number.isInteger(variant.stock) || variant.stock < 0)
    issues.push("Estoque da variante");
  if (variant.gtin && !validGtin(variant.gtin))
    issues.push("Código de barras válido");
  if (
    !product.name.trim() ||
    !product.brand.trim() ||
    !product.description.trim()
  )
    issues.push("Nome, marca e descrição");
  if (!canSell(product) && issues.length === 0)
    issues.push("Conferência do cadastro");
  return [...new Set(issues)];
}
export function channelReport(products: Product[], settings: FeedSettings) {
  const root = rootUrl(settings.siteUrl);
  const publicDomain =
    root.startsWith("https://") &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(root).hostname);
  const googleBlockers = [
    ...(!publicDomain ? ["Configurar o domínio público com HTTPS"] : []),
    ...(!settings.indexingEnabled
      ? ["Liberar a indexação após a validação da loja"]
      : []),
    ...(!settings.paymentsEnabled
      ? ["Ativar a compra online para o Google Shopping"]
      : []),
  ];
  const metaBlockers = !publicDomain
    ? ["Configurar o domínio público com HTTPS"]
    : [];
  const published = products.filter((p) => p.published);
  const models = published.map((product) => {
    const variants = product.variants.map((variant) => {
      const meta = variantIssues(product, variant);
      const google = [...meta];
      if (!variant.gtin?.trim() && !variant.mpn?.trim())
        google.push("Código de barras ou referência do fabricante");
      return {
        id: variant.id,
        label: variant.label,
        metaIssues: meta,
        googleIssues: [...new Set(google)],
      };
    });
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      variants,
    };
  });
  const metaDataReady = models.reduce(
    (sum, p) => sum + p.variants.filter((v) => !v.metaIssues.length).length,
    0,
  );
  const googleDataReady = models.reduce(
    (sum, p) => sum + p.variants.filter((v) => !v.googleIssues.length).length,
    0,
  );
  return {
    generatedAt: new Date().toISOString(),
    publishedProducts: published.length,
    totalVariants: published.reduce((n, p) => n + p.variants.length, 0),
    pendingProducts: models.filter((p) =>
      p.variants.some((v) => v.metaIssues.length || v.googleIssues.length),
    ).length,
    models,
    channels: {
      google: {
        url: root + feedPaths.google,
        dataReady: googleDataReady,
        exported: googleBlockers.length ? 0 : googleDataReady,
        blockers: googleBlockers,
      },
      meta: {
        url: root + feedPaths.meta,
        dataReady: metaDataReady,
        exported: metaBlockers.length ? 0 : metaDataReady,
        blockers: metaBlockers,
      },
    },
  };
}
function xml(value: string) {
  const text = [...value]
    .filter((c) => {
      const n = c.codePointAt(0)!;
      return (
        [9, 10, 13].includes(n) ||
        (n >= 0x20 && n <= 0xd7ff) ||
        (n >= 0xe000 && n <= 0xfffd) ||
        (n >= 0x10000 && n <= 0x10ffff)
      );
    })
    .join("");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
const tag = (name: string, value: string) =>
  `<g:${name}>${xml(value)}</g:${name}>`;
const money = (value: number) => `${(value / 100).toFixed(2)} BRL`;

export function productFeed(
  products: Product[],
  channel: FeedChannel,
  settings: FeedSettings,
) {
  const report = channelReport(products, settings);
  const root = rootUrl(settings.siteUrl);
  const allowed = new Set(
    report.channels[channel].blockers.length
      ? []
      : report.models.flatMap((p) =>
          p.variants
            .filter(
              (v) =>
                !(channel === "google" ? v.googleIssues : v.metaIssues).length,
            )
            .map((v) => feedItemId(p.id, v.id)),
        ),
  );
  const items: string[] = [];
  for (const product of products.filter((p) => p.published))
    for (const variant of product.variants) {
      const id = feedItemId(product.id, variant.id);
      if (!allowed.has(id)) continue;
      const link = new URL(productHref(product), root);
      link.searchParams.set("variant", variant.id);
      const title =
        product.variants.length > 1
          ? `${product.name} · ${variant.label}`
          : product.name;
      const generated =
        product.descriptionSource === "generated" ||
        (!product.descriptionSource &&
          product.tags.includes("videos-20261008"));
      const imageIndex = product.images.indexOf(variantImage(product, variant));
      const description =
        channel === "google" && generated
          ? `<g:structured_description>${tag("digital_source_type", "trained_algorithmic_media")}${tag("content", product.description)}</g:structured_description>`
          : tag("description", product.description);
      const fields = [
        tag("id", id),
        tag("item_group_id", groupId(product.id)),
        tag("title", [...title].slice(0, 150).join("")),
        description,
        tag("link", link.href),
        tag("image_link", catalogImageUrl(root, product, imageIndex)),
        ...(product.variants.length === 1
          ? product.images
              .map((_, i) => i)
              .filter((i) => i !== imageIndex)
              .slice(0, 10)
              .map((i) =>
                tag("additional_image_link", catalogImageUrl(root, product, i)),
              )
          : []),
        tag("availability", variant.stock > 0 ? "in_stock" : "out_of_stock"),
        tag("condition", "new"),
        tag("price", money(variant.priceCents)),
        ...(isOnPromotion(variant)
          ? [tag("sale_price", money(variant.promotionPriceCents!))]
          : []),
        tag("brand", product.brand),
        ...(variant.gtin ? [tag("gtin", variant.gtin)] : []),
        ...(variant.mpn ? [tag("mpn", variant.mpn)] : []),
        tag("color", variant.color),
        tag("material", product.material),
        tag(
          "size",
          `${variant.lensWidth}-${variant.bridge}-${variant.temple} mm`,
        ),
        tag(
          "product_type",
          product.category === "grau"
            ? "Óculos > Armações de grau"
            : "Óculos > Óculos de sol",
        ),
        tag(
          "google_product_category",
          product.category === "grau" ? "524" : "178",
        ),
      ];
      items.push(`<item>${fields.join("")}</item>`);
    }
  const content = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Óptica Ocular · ${channel === "google" ? "Google" : "Meta"}</title><link>${xml(root)}</link><description>Armações de grau e óculos de sol da Óptica Ocular.</description>${items.join("")}</channel></rss>`;
  return { content, count: items.length };
}
