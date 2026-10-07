"use client";
import { useSearchParams, usePathname } from "next/navigation";
import type { Product } from "@/lib/types";
import { minPrice } from "@/lib/product";
import ProductFilters, { type Filters } from "./ProductFilters";
import CategoryProducts from "./CategoryProducts";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export default function CategoryPageWrapper({
  products,
}: {
  products: Product[];
}) {
  const params = useSearchParams();
  const path = usePathname();
  const maxPrice = Math.max(
    10000,
    Math.ceil(Math.max(...products.map(minPrice), 0) / 10000) * 10000,
  );
  const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const rawPrice = Number(params.get("ate"));
  const filters: Filters = {
    search: params.get("busca") || "",
    brands: params.getAll("marca").filter((b) => brands.includes(b)),
    maxPrice:
      params.has("ate") && Number.isFinite(rawPrice)
        ? Math.max(0, Math.min(maxPrice, rawPrice))
        : maxPrice,
    sort: params.get("ordem") || "featured",
  };
  function change(f: Filters) {
    const next = new URLSearchParams();
    if (f.search.trim()) next.set("busca", f.search);
    f.brands.forEach((b) => next.append("marca", b));
    if (f.maxPrice < maxPrice) next.set("ate", String(f.maxPrice));
    if (f.sort !== "featured") next.set("ordem", f.sort);
    window.history.replaceState(
      null,
      "",
      `${path}${next.size ? "?" + next : ""}`,
    );
  }
  const search = normalize(filters.search.trim());
  const filtered = products
    .filter(
      (p) =>
        (!search ||
          normalize(
            `${p.name} ${p.brand} ${p.description} ${p.tags.join(" ")}`,
          ).includes(search)) &&
        (!filters.brands.length || filters.brands.includes(p.brand)) &&
        minPrice(p) <= filters.maxPrice,
    )
    .sort((a, b) =>
      filters.sort === "price-asc"
        ? minPrice(a) - minPrice(b)
        : filters.sort === "price-desc"
          ? minPrice(b) - minPrice(a)
          : filters.sort === "name"
            ? a.name.localeCompare(b.name, "pt-BR")
            : 0,
    );
  const clear = () =>
    change({ search: "", brands: [], maxPrice, sort: "featured" });
  return (
    <div className="store-catalog-layout">
      <ProductFilters
        brands={brands}
        maxPrice={maxPrice}
        filters={filters}
        onChange={change}
      />
      <div>
        <div className="store-active-filters">
          {filters.brands.map((b) => (
            <button
              type="button"
              key={b}
              onClick={() =>
                change({
                  ...filters,
                  brands: filters.brands.filter((x) => x !== b),
                })
              }
            >
              {" "}
              {b} <span aria-hidden="true">×</span>
              <span className="sr-only">Remover filtro</span>
            </button>
          ))}
        </div>
        <CategoryProducts products={filtered} onClear={clear} />
      </div>
    </div>
  );
}
