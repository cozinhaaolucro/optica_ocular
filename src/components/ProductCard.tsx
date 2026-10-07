import Link from "next/link";
import type { Product } from "@/lib/types";
import { availability, minPrice, productHref } from "@/lib/product";
import { formatCurrency } from "@/lib/currency";
import ProductImage from "./ProductImage";
export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="store-product-card">
      <Link
        href={productHref(product)}
        className="store-card-image"
        aria-label={`Ver ${product.name}`}
      >
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          priority={priority}
        />
      </Link>
      <div className="store-card-copy">
        <p className="eyebrow">{product.brand}</p>
        <h3>
          <Link href={productHref(product)}>{product.name}</Link>
        </h3>
        <p className="store-price">{formatCurrency(minPrice(product) / 100)}</p>
        <p className="store-price-note">
          {product.priceConfirmed
            ? product.category === "grau"
              ? "Armação · lentes à parte"
              : "Óculos de sol"
            : "Valor estimado"}
        </p>
        <p className="sr-only">{availability(product)}</p>
        <Link href={productHref(product)} className="store-card-link">
          Ver modelo
        </Link>
      </div>
    </article>
  );
}
