"use client";
import { useRef, useState } from "react";
import type { ChannelReport, FeedChannel } from "@/lib/marketing-feeds";
import { normalizeSearch } from "@/lib/admin-utils";

export default function AdminChannels({
  report,
  onEdit,
  busy,
}: {
  report: ChannelReport;
  onEdit: (id: string) => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const inputs = useRef<Partial<Record<FeedChannel, HTMLInputElement | null>>>(
    {},
  );
  async function copy(channel: FeedChannel) {
    try {
      await navigator.clipboard.writeText(report.channels[channel].url);
      setMessage(
        `Link do ${channel === "google" ? "Google" : "Meta"} copiado.`,
      );
    } catch {
      inputs.current[channel]?.select();
      setMessage("O link está selecionado. Use Copiar no seu navegador.");
    }
  }
  const models = report.models
    .map((p) => ({
      ...p,
      issues: [
        ...new Set(
          p.variants.flatMap((v) => [...v.metaIssues, ...v.googleIssues]),
        ),
      ],
      ready: p.variants.filter((v) => !v.metaIssues.length).length,
    }))
    .filter((p) => {
      const term = normalizeSearch(search);
      return (
        normalizeSearch(`${p.name} ${p.brand}`).includes(term) &&
        (filter === "all" ||
          (filter === "pending" ? p.issues.length > 0 : p.ready > 0))
      );
    });
  const pages = Math.max(1, Math.ceil(models.length / 12));
  const current = Math.min(page, pages);
  return (
    <>
      <p className="admin-page-description">
        Conecte o catálogo ao Google e à Meta por um link. As fontes usam os
        preços, fotos e variantes salvos no painel.
      </p>
      <p className="admin-channel-updated">
        Última conferência:{" "}
        {new Date(report.generatedAt).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
      <div className="admin-metrics">
        {[
          ["Modelos publicados", report.publishedProducts],
          ["Variantes no feed Meta", report.channels.meta.exported],
          ["Variantes no feed Google", report.channels.google.exported],
          ["Modelos com pendências", report.pendingProducts],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-channel-grid">
        {(["google", "meta"] as const).map((channel) => {
          const feed = report.channels[channel];
          const name =
            channel === "google"
              ? "Google Merchant Center"
              : "Meta Commerce Manager";
          return (
            <section className="admin-card admin-channel-card" key={channel}>
              <div className="admin-channel-heading">
                <h2>{name}</h2>
                <span
                  className={`admin-badge ${feed.exported ? "is-ready" : ""}`}
                >
                  {feed.exported ? "Com produtos" : "Preparado"}
                </span>
              </div>
              <p className="admin-channel-description">
                {channel === "google"
                  ? "Produtos para o Google Shopping e listagens gratuitas."
                  : "Catálogo para campanhas de produtos no Facebook e Instagram."}
              </p>
              <label htmlFor={`channel-${channel}`}>
                Link da fonte de produtos
              </label>
              <input
                id={`channel-${channel}`}
                ref={(element) => {
                  inputs.current[channel] = element;
                }}
                value={feed.url}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <div className="admin-channel-actions">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => void copy(channel)}
                >
                  Copiar link
                </button>
                <a href={feed.url} target="_blank" rel="noopener noreferrer">
                  Abrir XML
                </a>
              </div>
              <p className="admin-channel-count">
                <strong>{feed.exported}</strong> variantes exportadas ·{" "}
                <strong>{feed.dataReady}</strong> com cadastro completo
              </p>
              {feed.blockers.length > 0 && (
                <div className="admin-channel-pending">
                  <p>Para liberar este canal</p>
                  <ul>
                    {feed.blockers.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <details className="admin-channel-guide">
                <summary>Como conectar</summary>
                <ol>
                  <li>
                    {channel === "google"
                      ? "No Merchant Center, abra Configurações → Fontes de dados → Adicionar fonte de produtos."
                      : "No Commerce Manager, abra o catálogo → Fontes de dados → Feed de dados."}
                  </li>
                  <li>Escolha a importação por URL e cole o link acima.</li>
                  <li>
                    Configure a atualização diária e confira os diagnósticos da
                    plataforma.
                  </li>
                </ol>
                <p>
                  O arquivo fica disponível sem login. Publicação e aprovação
                  são acompanhadas na conta da plataforma.
                </p>
              </details>
            </section>
          );
        })}
      </div>
      {message && (
        <p role="status" className="store-success admin-notice">
          {message}
        </p>
      )}
      <section className="admin-card admin-channel-diagnostics">
        <div className="admin-section-heading">
          <div>
            <h2>Preparação dos produtos</h2>
            <p>
              Corrija os campos indicados e confirme o cadastro para incluí-lo
              no feed.
            </p>
          </div>
        </div>
        <div className="admin-filter-bar">
          <input
            type="search"
            aria-label="Buscar produtos dos canais"
            placeholder="Buscar modelo ou marca"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filtrar preparação dos produtos"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="pending">Com pendências</option>
            <option value="ready">Prontos para a Meta</option>
            <option value="all">Todos os publicados</option>
          </select>
        </div>
        <div className="admin-channel-models">
          {models.slice((current - 1) * 12, current * 12).map((product) => (
            <article className="admin-channel-model" key={product.id}>
              <div>
                <h3>{product.name}</h3>
                <span>
                  {product.brand} · {product.variants.length}{" "}
                  {product.variants.length === 1 ? "variante" : "variantes"}
                </span>
                {product.issues.length > 0 ? (
                  <details>
                    <summary>
                      {product.issues.length}{" "}
                      {product.issues.length === 1
                        ? "campo a conferir"
                        : "campos a conferir"}
                    </summary>
                    <ul>
                      {product.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <p className="admin-channel-ready">
                    Cadastro pronto para os feeds
                  </p>
                )}
              </div>
              <button
                type="button"
                className="admin-secondary"
                disabled={busy}
                onClick={() => onEdit(product.id)}
              >
                Revisar cadastro
              </button>
            </article>
          ))}
          {!models.length && (
            <div className="admin-empty">
              {search
                ? "Nenhum modelo encontrado."
                : filter === "pending"
                  ? "Os produtos publicados estão com os campos dos feeds completos."
                  : filter === "ready"
                    ? "Os modelos aparecerão aqui após a conferência das fotos, variantes e preços."
                    : "Publique um produto para acompanhar sua preparação."}
            </div>
          )}
        </div>
        {models.length > 12 && (
          <div className="admin-pagination">
            <span>
              {models.length} modelos · página {current} de {pages}
            </span>
            <div>
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="admin-channel-footnote">
        Promoções e disponibilidade acompanham o cadastro. Produtos ocultos ou
        sem validação ficam fora dos arquivos. Lentes de grau seguem pelo
        atendimento separado.
      </p>
    </>
  );
}
