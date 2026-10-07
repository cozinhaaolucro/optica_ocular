import Link from "next/link";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";
export default function HomeProductSection({
  products,
}: {
  products: Product[];
}) {
  const selection = [
    ...products.filter((p) => p.category === "grau").slice(0, 2),
    ...products.filter((p) => p.category === "sol").slice(0, 2),
  ];
  return (
    <section className="store-section" id="produtos">
      <div className="store-section-top">
        <div>
          <h2>
            Modelos em <em>destaque.</em>
          </h2>
        </div>
        <Link href="/oculos" className="text-link">
          Ver coleções
        </Link>
      </div>
      <div className="store-products-grid home-selection">
        {selection.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
