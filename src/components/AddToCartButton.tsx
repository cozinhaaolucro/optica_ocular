"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/lib/types";
import { canSell } from "@/lib/product";
import { track } from "@/lib/analytics";
export default function AddToCartButton({
  product,
  variantId,
}: {
  product: Product;
  variantId: string;
}) {
  const { addItem, ready } = useCart();
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId);
  const soldOut = canSell(product) && !variant?.stock;
  return (
    <div className="store-add">
      <button
        className="button"
        disabled={!ready || soldOut}
        type="button"
        onClick={() => {
          if (addItem(product, variantId)) {
            setAdded(true);
            track("add_to_cart", product.category);
          }
        }}
      >
        {soldOut
          ? "Esgotado"
          : added
            ? "Adicionar mais um"
            : canSell(product)
              ? "Adicionar ao carrinho"
              : "Adicionar à minha seleção"}
      </button>
      {added && (
        <p role="status" className="store-add-feedback">
          Adicionado. <Link href="/carrinho">Ver meu carrinho</Link>
        </p>
      )}
    </div>
  );
}
