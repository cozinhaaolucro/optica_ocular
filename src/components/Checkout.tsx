"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/currency";
import { track } from "@/lib/analytics";
export default function Checkout() {
  const {
    items,
    lines,
    ready,
    error: cartError,
    totalCents,
    clearCart,
  } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    track("begin_checkout");
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const f = new FormData(event.currentTarget);
    const customer = {
      name: String(f.get("name") || ""),
      email: String(f.get("email") || ""),
      phone: String(f.get("phone") || ""),
    };
    const fingerprint = JSON.stringify({ lines, customer });
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          customer,
          idempotencyKey: attempt.current!.key,
          privacyAccepted: f.get("privacy") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Confira os dados e tente novamente.");
      track("quote_requested");
      clearCart();
      router.push(`/pedido/${data.order.id}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar. Tente novamente.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <h1>
          Solicite seu <em>orçamento.</em>
        </h1>
        <p>Deixe seu contato para conversar sobre os modelos escolhidos.</p>
      </div>
      {!ready ? (
        <p role="status">Preparando sua seleção…</p>
      ) : !items.length ? (
        <div className="store-empty">
          <p>Adicione um modelo ao carrinho para continuar.</p>
          <Link href="/oculos" className="button">
            Conhecer as coleções
          </Link>
        </div>
      ) : (
        <div className="store-checkout-layout">
          <form onSubmit={submit} className="store-form">
            <h2>Como podemos falar com você?</h2>
            <div className="store-field">
              <label htmlFor="checkout-name">Seu nome</label>
              <input
                id="checkout-name"
                name="name"
                autoComplete="name"
                required
                minLength={3}
                maxLength={120}
              />
            </div>
            <div className="store-field">
              <label htmlFor="checkout-email">E-mail</label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
              />
            </div>
            <div className="store-field">
              <label htmlFor="checkout-phone">Telefone com DDD</label>
              <input
                id="checkout-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(41) 99999-9999"
                required
                maxLength={20}
                pattern="[0-9()+ \-]{10,20}"
              />
            </div>
            <fieldset className="store-pickup">
              <legend>Retirada</legend>
              <p>
                <strong>Óptica Ocular · Curitiba</strong>
                <br />
                Rua Bispo Dom José, 2655 · Seminário
              </p>
              <p>Disponibilidade e data serão combinadas com a equipe.</p>
            </fieldset>
            <label className="store-checkbox">
              <input name="privacy" type="checkbox" required />
              <span>
                Li como meus dados serão usados para tratar esta solicitação na{" "}
                <Link href="/privacidade" target="_blank">
                  página de privacidade
                </Link>
                .
              </span>
            </label>
            {(error || cartError) && (
              <p className="store-error" role="alert">
                {error || cartError}
              </p>
            )}
            <button
              className="button"
              type="submit"
              disabled={busy || !!cartError}
            >
              {busy
                ? "Enviando sua seleção…"
                : "Enviar solicitação de orçamento"}
            </button>
            <p className="store-muted">
              Solicitação sem cobrança ou reserva de estoque.
            </p>
          </form>
          <aside className="store-order-summary">
            <h2>Revise sua seleção</h2>
            {items.map((i) => (
              <div
                className="store-review-item"
                key={`${i.productId}-${i.variantId}`}
              >
                <span>
                  {i.quantity} × {i.name}
                  {i.variantLabel !== "Modelo a confirmar" && (
                    <small>{i.variantLabel}</small>
                  )}
                </span>
                <strong className="store-price">
                  {formatCurrency((i.priceCents * i.quantity) / 100)}
                </strong>
              </div>
            ))}
            <dl>
              <div>
                <dt>Valor estimado</dt>
                <dd className="store-price">
                  {formatCurrency(totalCents / 100)}
                </dd>
              </div>
            </dl>
            <p>Lentes de grau são orçadas à parte.</p>
            <Link href="/carrinho" className="text-link">
              Editar minha seleção
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
