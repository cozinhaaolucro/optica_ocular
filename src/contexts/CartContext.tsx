"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { canSell, sellingPrice } from "@/lib/product";
import type { Product, CartLine, CartItem } from "@/lib/types";
type Snapshot = {
  lines: CartLine[];
  products: Product[];
  ready: boolean;
  error: string | null;
  message: string;
};
let snapshot: Snapshot = {
  lines: [],
  products: [],
  ready: false,
  error: null,
  message: "",
};
let initialized = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function parse(value: string | null): CartLine[] {
  if (!value) return [];
  const input: unknown = JSON.parse(value);
  if (!Array.isArray(input)) throw new Error("invalid");
  const result: CartLine[] = [];
  for (const row of input.slice(0, 30))
    if (
      row &&
      typeof row === "object" &&
      typeof row.productId === "string" &&
      typeof row.variantId === "string" &&
      Number.isInteger(row.quantity) &&
      row.quantity > 0 &&
      row.quantity <= 10 &&
      !result.some(
        (l) => l.productId === row.productId && l.variantId === row.variantId,
      )
    )
      result.push({
        productId: row.productId,
        variantId: row.variantId,
        quantity: row.quantity,
      });
  return result;
}
function persist(lines: CartLine[], message = "") {
  snapshot = { ...snapshot, lines, message };
  try {
    localStorage.setItem("ocular-cart-v2", JSON.stringify(lines));
  } catch {
    snapshot = {
      ...snapshot,
      message:
        "O carrinho está disponível nesta página, mas o navegador não permitiu salvar os itens.",
    };
  }
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized) {
    initialized = true;
    try {
      snapshot = {
        ...snapshot,
        lines: parse(localStorage.getItem("ocular-cart-v2")),
      };
    } catch {
      snapshot = {
        ...snapshot,
        message:
          "Não foi possível restaurar o carrinho salvo. Adicione seus itens novamente.",
      };
    }
    emit();
  }
  return () => {
    listeners.delete(listener);
  };
}
function applyStorage(event: StorageEvent) {
  if (event.key === "ocular-cart-v2") {
    try {
      snapshot = { ...snapshot, lines: parse(event.newValue) };
      emit();
    } catch {
      /* Keep the current valid cart. */
    }
  }
}
function cartItems(): CartItem[] {
  return snapshot.lines.map((l) => {
    const p = snapshot.products.find((p) => p.id === l.productId);
    const v = p?.variants.find((v) => v.id === l.variantId);
    if (!p || !v)
      return {
        ...l,
        name: "Modelo indisponível",
        brand: "",
        slug: "",
        category: "",
        variantLabel: "Remova este item para continuar",
        priceCents: 0,
        image: "",
        available: false,
      };
    return {
      ...l,
      name: p.name,
      brand: p.brand,
      slug: p.slug,
      category: p.category,
      variantLabel: v.label,
      priceCents: sellingPrice(v),
      image: p.images[0] || "",
      available: canSell(p) && v.stock >= l.quantity,
    };
  });
}
function addItem(product: Product, variantId: string) {
  const current = snapshot.products.find((p) => p.id === product.id);
  const variant = current?.variants.find((v) => v.id === variantId);
  if (!snapshot.ready || snapshot.error || !current || !variant) {
    snapshot = {
      ...snapshot,
      message:
        "Não foi possível adicionar este modelo. Atualize a página e tente novamente.",
    };
    emit();
    return false;
  }
  const prev = snapshot.lines.find(
    (l) => l.productId === product.id && l.variantId === variantId,
  );
  const quantity = (prev?.quantity || 0) + 1;
  const max = canSell(current) ? Math.min(10, variant.stock) : 10;
  if (quantity > max || (!prev && snapshot.lines.length >= 30)) {
    snapshot = {
      ...snapshot,
      message: "Quantidade máxima disponível alcançada.",
    };
    emit();
    return false;
  }
  persist(
    prev
      ? snapshot.lines.map((l) => (l === prev ? { ...l, quantity } : l))
      : [...snapshot.lines, { productId: product.id, variantId, quantity }],
    `${product.name} adicionado ao carrinho.`,
  );
  return true;
}
function removeItem(productId: string, variantId: string) {
  persist(
    snapshot.lines.filter(
      (l) => l.productId !== productId || l.variantId !== variantId,
    ),
    "Item removido do carrinho.",
  );
}
function updateQuantity(
  productId: string,
  variantId: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity > 10) return;
  if (quantity <= 0) {
    removeItem(productId, variantId);
    return;
  }
  const p = snapshot.products.find((p) => p.id === productId);
  const v = p?.variants.find((v) => v.id === variantId);
  if (p && v && canSell(p) && quantity > v.stock) {
    snapshot = { ...snapshot, message: "Essa quantidade não está disponível." };
    emit();
    return;
  }
  persist(
    snapshot.lines.map((l) =>
      l.productId === productId && l.variantId === variantId
        ? { ...l, quantity }
        : l,
    ),
  );
}
const methods = {
  addItem,
  removeItem,
  updateQuantity,
  clearCart: () => persist([], "Carrinho limpo."),
};
type Context = typeof methods & {
  items: CartItem[];
  lines: CartLine[];
  ready: boolean;
  error: string | null;
  message: string;
  totalItems: number;
  totalCents: number;
};
const CartContext = createContext<Context | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch("/api/catalog", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data.products)) throw new Error();
        snapshot = {
          ...snapshot,
          products: data.products,
          ready: true,
          error: null,
        };
        emit();
      })
      .catch(() => {
        if (active) {
          snapshot = {
            ...snapshot,
            ready: true,
            error:
              "Não foi possível atualizar o catálogo. Recarregue a página para tentar novamente.",
          };
          emit();
        }
      })
      .finally(() => clearTimeout(timeout));
    window.addEventListener("storage", applyStorage);
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
      window.removeEventListener("storage", applyStorage);
    };
  }, []);
  const items = state ? cartItems() : [];
  return (
    <CartContext.Provider
      value={{
        ...methods,
        items,
        lines: state?.lines || [],
        ready: state?.ready || false,
        error:
          state?.error ||
          (state?.ready && !state.error && items.some((item) => !item.slug)
            ? "Remova os modelos indisponíveis para continuar."
            : null),
        message: state?.message || "",
        totalItems: items.reduce((s, i) => s + i.quantity, 0),
        totalCents: items.reduce((s, i) => s + i.quantity * i.priceCents, 0),
      }}
    >
      {children}
      <div className="sr-only" role="status" aria-live="polite">
        {state?.message}
      </div>
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider necessário.");
  return value;
}
