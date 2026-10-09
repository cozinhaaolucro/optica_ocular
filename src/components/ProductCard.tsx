import Link from "next/link";
import type { Product } from "@/lib/types";
import {
  availability,
  sellingPrice,
  lowestAvailablePricedVariant,
  isOnPromotion,
  productHref,
} from "@/lib/product";
import { formatCurrency } from "@/lib/currency";
import ProductImage from "./ProductImage";
export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const variant = lowestAvailablePricedVariant(product);
  const promotion = isOnPromotion(variant);
  const price = sellingPrice(variant);
  const available = product.variants.filter((v) => v.stock > 0);
  const varies = (available.length ? available : product.variants).some(
    (v) => sellingPrice(v) !== price,
  );
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
        {promotion && (
          <span className="store-price-was">
            <span className="sr-only">De </span>
            <del>{formatCurrency(variant.priceCents / 100)}</del>
          </span>
        )}
        <p className="store-price">
          {promotion && <span className="sr-only">Por </span>}
          {price > 0 ? (
            <>
              {varies && (
                <span className="store-price-prefix">A partir de </span>
              )}
              {formatCurrency(price / 100)}
            </>
          ) : (
            "Consulte o valor"
          )}
        </p>
        <p className="store-price-note">
          {price > 0 && product.priceConfirmed
            ? product.category === "grau"
              ? "Armação · lentes à parte"
              : "Óculos de sol"
            : price > 0
              ? "Valor estimado"
              : product.category === "grau"
                ? "Armação · lentes à parte"
                : "Óculos de sol"}
        </p>
        <p className="sr-only">{availability(product)}</p>
        <Link href={productHref(product)} className="store-card-link">
          Ver modelo
        </Link>
      </div>
    </article>
  );
}
