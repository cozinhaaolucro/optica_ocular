import seed from "@/data/products-data.json";
import type { Product } from "./types";

// Reference data for an empty local database and the public validation catalog.
// Never inherit the legacy JSON's photos or "in stock" declarations.
export function referenceProducts(): Product[] {
  return seed.products.map((p) => ({
    revision: 0,
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category as Product["category"],
    description: p.description,
    material: "",
    features: [...p.features],
    tags: [...p.tags],
    images: [],
    verified: false,
    priceConfirmed: false,
    published: true,
    package: null,
    variants: [
      {
        id: `${p.id}-default`,
        sku: "",
        label: "Modelo a confirmar",
        color: "",
        lensWidth: null,
        bridge: null,
        temple: null,
        priceCents: Math.round(p.price * 100),
        stock: 0,
      },
    ],
  }));
}
