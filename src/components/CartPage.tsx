"use client";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import ProductImage from "./ProductImage";
import { formatCurrency } from "@/lib/currency";
export default function CartPage() {
  const {
    items,
    ready,
    error,
    totalItems,
    totalCents,
    removeItem,
    updateQuantity,
    clearCart,
    message,
  } = useCart();
  const hasUnpricedItems = items.some((item) => item.priceCents <= 0);
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <h1>
          Seu <em>carrinho.</em>
        </h1>
        <p>
          {ready
            ? `${totalItems} ${totalItems === 1 ? "item selecionado" : "itens selecionados"}`
            : "Restaurando sua seleção…"}
        </p>
      </div>
      {error && (
        <p role="alert" className="store-error">
          {error}
        </p>
      )}
      {!ready ? (
        <div className="store-cart-skeleton" aria-busy="true" role="status">
          Preparando seu carrinho…
        </div>
      ) : !items.length ? (
        <div className="store-empty">
          <h2>
            Seu carrinho está <em>vazio.</em>
          </h2>
          <p>Explore as coleções e adicione os modelos que quer conhecer.</p>
          <Link href="/oculos" className="button">
            Explorar as coleções
          </Link>
        </div>
      ) : (
        <div className="store-cart-layout">
          <div className="store-cart-items">
            {items.map((item) => (
              <article
                key={`${item.productId}-${item.variantId}`}
                className="store-cart-item"
              >
                <div className="store-cart-image">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    sizes="150px"
                  />
                </div>
                <div>
                  <p className="eyebrow">{item.brand}</p>
                  <h2>
                    {item.slug ? (
                      <Link href={`/produtos/${item.category}/${item.slug}`}>
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </h2>
                  {item.variantLabel !== "Modelo a confirmar" && (
                    <p className="store-muted">{item.variantLabel}</p>
                  )}
                  <p className="store-price">
                    {item.priceCents > 0
                      ? formatCurrency(item.priceCents / 100)
                      : "Consulte o valor"}
                  </p>
                  <p className="store-price-note">
                    {item.priceCents > 0
                      ? item.available
                        ? "Preço do item"
                        : "Valor estimado"
                      : ""}
                  </p>
                  <div
                    className="store-quantity"
                    role="group"
                    aria-label={`Quantidade de ${item.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                    >
                      −
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={item.quantity >= 10}
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="store-remove"
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Remover ${item.name}`}
                  >
                    Remover
                  </button>
                </div>
                <p className="store-price store-cart-line-total">
                  {item.priceCents > 0
                    ? formatCurrency((item.priceCents * item.quantity) / 100)
                    : "Sob consulta"}
                </p>
              </article>
            ))}
            <p className="store-muted" role="status">
              {message}
            </p>
            <div className="store-cart-bottom">
              <Link href="/oculos" className="text-link">
                Continuar escolhendo
              </Link>
              <button
                className="store-clear-link"
                type="button"
                onClick={clearCart}
              >
                Limpar carrinho
              </button>
            </div>
          </div>
          <aside className="store-order-summary">
            <h2>Sua seleção</h2>
            <dl>
              <div>
                <dt>
                  {hasUnpricedItems && totalCents > 0
                    ? "Subtotal dos valores informados"
                    : "Valor estimado"}
                </dt>
                <dd className="store-price">
                  {totalCents > 0
                    ? formatCurrency(totalCents / 100)
                    : "Sob consulta"}
                </dd>
              </div>
              <div>
                <dt>Retirada</dt>
                <dd>Na loja, a combinar</dd>
              </div>
            </dl>
            {hasUnpricedItems && totalCents > 0 && (
              <p>
                Os itens sem valor informado serão incluídos no orçamento da
                equipe.
              </p>
            )}
            <p>Envie sua seleção para receber um orçamento da loja.</p>
            <Link
              href="/checkout"
              className="button"
              aria-disabled={!!error}
              onClick={(e) => {
                if (error) e.preventDefault();
              }}
            >
              Solicitar orçamento
            </Link>
            <p className="store-price-note">
              Lentes de grau são orçadas à parte.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
