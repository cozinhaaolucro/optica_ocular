"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
export interface Filters {
  search: string;
  brands: string[];
  maxPrice: number;
  sort: string;
}
export default function ProductFilters({
  brands,
  maxPrice,
  filters,
  onChange,
}: {
  brands: string[];
  maxPrice: number;
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside
      className={`store-filters ${expanded ? "is-open" : ""}`}
      aria-label="Filtros de produtos"
    >
      <div className="store-filters-title">
        <h2>Encontre seu modelo</h2>
        <button
          className="store-filter-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="catalog-filters"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Fechar filtros" : "Filtrar modelos"}
        </button>
      </div>
      <div id="catalog-filters" className="store-filter-content">
        <label htmlFor="product-search">Buscar modelo ou marca</label>
        <input
          id="product-search"
          type="search"
          placeholder="O que você procura?"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
        <fieldset>
          <legend>Marca</legend>
          <div className="store-brand-filters">
            {brands.map((brand) => (
              <label key={brand}>
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      brands: filters.brands.includes(brand)
                        ? filters.brands.filter((b) => b !== brand)
                        : [...filters.brands, brand],
                    })
                  }
                />
                <span>{brand}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor="product-max-price">
          Preço até{" "}
          <strong className="monetary-value">
            {formatCurrency(filters.maxPrice / 100)}
          </strong>
        </label>
        <input
          type="range"
          id="product-max-price"
          min={0}
          max={maxPrice}
          step={100}
          value={filters.maxPrice}
          aria-valuetext={formatCurrency(filters.maxPrice / 100)}
          onChange={(e) =>
            onChange({ ...filters, maxPrice: Number(e.target.value) })
          }
        />
        <label htmlFor="product-sort">Ordenar por</label>
        <select
          id="product-sort"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        >
          <option value="featured">Nossa seleção</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
          <option value="name">Nome: A–Z</option>
        </select>
        <button
          type="button"
          className="store-clear-link"
          onClick={() =>
            onChange({ search: "", brands: [], maxPrice, sort: "featured" })
          }
        >
          Limpar filtros
        </button>
      </div>
    </aside>
  );
}
