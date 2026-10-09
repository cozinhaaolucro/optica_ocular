"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { whatsapp } from "@/lib/product";
export default function OrderConfirmation({ id }: { id: string }) {
  const [order, setOrder] = useState<Omit<
    Order,
    "token" | "idempotencyKey"
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = setTimeout(() => c.abort(), 20000);
    fetch(`/api/orders/${id}`, {
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.order)
          throw new Error(
            d?.error ||
              "Não foi possível localizar sua solicitação. Recarregue a página ou fale com a loja.",
          );
        return d;
      })
      .then((d) => {
        if (active) setOrder(d.order);
      })
      .catch((e) => {
        if (active)
          setError(
            e.name === "AbortError" || e instanceof TypeError
              ? "Não foi possível carregar sua solicitação. Recarregue a página ou fale com a loja."
              : e.message,
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      c.abort();
    };
  }, [id]);
  return (
    <main id="conteudo" className="store-page store-confirmation">
      {error ? (
        <>
          <h1>
            Vamos encontrar
            <br />
            <em>seu atendimento.</em>
          </h1>
          <p role="alert">{error}</p>
          <Link href="/visite" className="button">
            Falar com a loja
          </Link>
        </>
      ) : !order ? (
        <p role="status">Localizando sua solicitação…</p>
      ) : (
        <>
          <p className="eyebrow">Seleção registrada</p>
          <h1>
            O próximo passo
            <br />é <em>conversar.</em>
          </h1>
          <p>
            Sua solicitação <strong>{order.number}</strong> foi registrada.
            Continue pelo WhatsApp para conversar sobre seu orçamento.
          </p>
          <div className="store-confirmation-card">
            <p className="store-status-pill">
              {order.status === "quote_requested"
                ? "Aguardando atendimento"
                : "Em acompanhamento"}
            </p>
            {order.items.map((i) => (
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
                <span className="store-price">
                  {i.priceCents > 0
                    ? formatCurrency((i.priceCents * i.quantity) / 100)
                    : "Sob consulta"}
                </span>
              </div>
            ))}
            <p className="store-muted">
              Retirada na loja, a combinar. Nenhum pagamento foi realizado.
            </p>
          </div>
          <a
            className="button"
            href={whatsapp(
              `Olá! Enviei a solicitação ${order.number} pelo site da Óptica Ocular e gostaria de continuar meu orçamento.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continuar com a equipe no WhatsApp
          </a>
          <p className="store-muted">
            Guarde o número da solicitação para retomar o atendimento.
          </p>
          <Link href="/oculos" className="text-link">
            Voltar às coleções
          </Link>
        </>
      )}
    </main>
  );
}
