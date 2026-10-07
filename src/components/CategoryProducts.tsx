import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
export default function CategoryProducts({
  products,
  onClear,
}: {
  products: Product[];
  onClear?: () => void;
}) {
  return products.length ? (
    <>
      <div className="store-products-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <p className="store-result-count" role="status">
        {products.length}{" "}
        {products.length === 1 ? "modelo encontrado" : "modelos encontrados"}
      </p>
    </>
  ) : (
    <div className="store-empty">
      <h2>Nenhum modelo encontrado.</h2>
      <p>Nenhum modelo corresponde aos filtros selecionados.</p>
      <button type="button" className="button" onClick={onClear}>
        Limpar filtros
      </button>
    </div>
  );
}
