"use client";
export function track(
  event: "view_product" | "add_to_cart" | "begin_checkout" | "quote_requested",
  category?: string,
) {
  window.dispatchEvent(
    new CustomEvent("ocular-event", { detail: { event, category } }),
  );
}
