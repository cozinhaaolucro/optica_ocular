import type { Product } from "./types";

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
export const minPrice = (p: Product) =>
  Math.min(...p.variants.map((v) => v.priceCents));
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
    p.variants.every(
      (v) =>
        v.sku.trim() && v.color.trim() && v.lensWidth && v.bridge && v.temple,
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
