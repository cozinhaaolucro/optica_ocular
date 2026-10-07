"use client";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
export default function CartIcon() {
  const { totalItems } = useCart();
  return (
    <Link
      href="/carrinho"
      className="store-cart-link"
      aria-label={`Carrinho de compras${totalItems ? `, ${totalItems} ${totalItems === 1 ? "item" : "itens"}` : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </svg>
      {totalItems > 0 && <span className="store-cart-count">{totalItems}</span>}
    </Link>
  );
}
