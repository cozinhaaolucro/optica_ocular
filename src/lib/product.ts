import type { Product, Variant } from "./types";

export const categories = [
  {
    id: "grau",
    name: "Óculos de grau",
    description: "Escolha sua armação. Lentes de grau são orçadas à parte.",
    image: "/assets/ensaio/grau-retrato-1122.webp",
  },
  {
    id: "sol",
    name: "Óculos de sol",
    description: "Modelos e marcas para os dias de sol.",
    image: "/assets/ensaio/sol-retrato-1122.webp",
  },
] as const;
export const productHref = (p: Product) => `/produtos/${p.category}/${p.slug}`;
export function isOnPromotion(v: Variant) {
  return (
    Number.isInteger(v.promotionPriceCents) &&
    (v.promotionPriceCents ?? 0) > 0 &&
    v.promotionPriceCents! < v.priceCents
  );
}
export const sellingPrice = (v: Variant) =>
  isOnPromotion(v) ? v.promotionPriceCents! : v.priceCents;
export const lowestPricedVariant = (p: Product) =>
  p.variants.reduce((lowest, v) =>
    sellingPrice(v) < sellingPrice(lowest) ? v : lowest,
  );
export function lowestAvailablePricedVariant(p: Product) {
  const available = p.variants.filter((variant) => variant.stock > 0);
  return lowestPricedVariant(
    available.length ? { ...p, variants: available } : p,
  );
}
export function selectVariant(p: Product, id?: string) {
  return p.variants.find((v) => v.id === id) || lowestAvailablePricedVariant(p);
}
export function variantImage(p: Product, v: Variant) {
  return v.image && p.images.includes(v.image) ? v.image : p.images[0] || "";
}
export function hasVariantPhotos(p: Product) {
  const colors = new Set(p.variants.map((v) => v.color.trim().toLowerCase()));
  return p.variants.every(
    (v) =>
      (!v.image || p.images.includes(v.image)) &&
      (colors.size <= 1 || !!v.image),
  );
}
export const minPrice = (p: Product) => sellingPrice(lowestPricedVariant(p));
export function canSell(p: Product) {
  return (
    p.published &&
    p.verified &&
    p.priceConfirmed &&
    p.images.length >= 3 &&
    new Set(p.images).size === p.images.length &&
    p.images.every((i) => !i.includes("/placeholders/")) &&
    p.material.trim().length > 0 &&
    p.variants.length > 0 &&
    hasVariantPhotos(p) &&
    p.variants.every(
      (v) =>
        v.sku.trim() &&
        v.color.trim() &&
        v.lensWidth &&
        v.bridge &&
        v.temple &&
        Number.isInteger(v.priceCents) &&
        v.priceCents > 0,
    )
  );
}
export function availability(p: Product) {
  if (!canSell(p)) return "Disponibilidade sob consulta";
  return p.variants.some((v) => v.stock > 0) ? "Disponível" : "Esgotado";
}
export function whatsapp(message: string) {
  return `https://wa.me/5541997502091?text=${encodeURIComponent(message)}`;
}
