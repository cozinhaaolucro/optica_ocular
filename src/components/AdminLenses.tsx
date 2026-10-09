"use client";
import { useState } from "react";
import {
  matchesLensFilter,
  lensDecimal,
  lensCents,
  type LensRow,
  type LensEdit,
  type LensFilter,
  type LensBulkAction,
} from "@/lib/lens-management";
import { csv } from "@/lib/admin-utils";

export default function AdminLenses({
  data,
  edits,
  onEdits,
  busy,
  onSave,
  onBulk,
}: {
  data: { revision: number; rows: LensRow[] } | null;
  edits: Record<string, LensEdit>;
  onEdits: (next: Record<string, LensEdit>) => void;
  busy: boolean;
  onSave: () => Promise<void>;
  onBulk: (
    filter: LensFilter,
    action: LensBulkAction,
    count: number,
  ) => Promise<void>;
}) {
  const [filter, setFilter] = useState<LensFilter>({ status: "all" });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("hide");
  const [percent, setPercent] = useState("10");
  const [error, setError] = useState("");
  const all = data?.rows || [];
  const rows = all.filter((row) => matchesLensFilter(row, filter));
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const pending = Object.keys(edits).length;
  function prices(row: LensRow) {
    const draft = edits[row.id];
    const promotion =
      draft?.promotion ??
      (row.promotionPriceCents === null
        ? ""
        : lensDecimal(row.promotionPriceCents));
    const regular = lensCents(draft?.price ?? lensDecimal(row.priceCents));
    const promotional = promotion.trim() ? lensCents(promotion) : null;
    return {
      promotion,
      regular,
      promotional,
      valid:
        Number.isFinite(regular) &&
        regular > 0 &&
        regular <= 10000000 &&
        (promotional === null ||
          (Number.isFinite(promotional) &&
            promotional > 0 &&
            promotional < regular)),
    };
  }
  const invalidEdits = all.filter(
    (row) => edits[row.id] && !prices(row).valid,
  ).length;
  const brands = [...new Set(all.map((r) => r.brand))].sort();
  const categories = [
    ...new Set(
      all
        .filter((r) => !filter.brand || r.brand === filter.brand)
        .map((r) => r.category),
    ),
  ].sort();
  const lines = [
    ...new Set(
      all
        .filter(
          (r) =>
            (!filter.brand || r.brand === filter.brand) &&
            (!filter.category || r.category === filter.category),
        )
        .map((r) => r.line),
    ),
  ].sort();
  function changeFilter(next: LensFilter) {
    setFilter(next);
    setPage(1);
    setError("");
  }
  function edit(row: LensRow, change: LensEdit) {
    const next = { ...edits, [row.id]: { ...edits[row.id], ...change } };
    const value = next[row.id];
    if (value.price !== undefined && lensCents(value.price) === row.priceCents)
      delete value.price;
    if (
      value.promotion !== undefined &&
      (value.promotion.trim() === "" ? null : lensCents(value.promotion)) ===
        row.promotionPriceCents
    )
      delete value.promotion;
    if (value.enabled === row.enabled) delete value.enabled;
    if (!Object.keys(value).length) delete next[row.id];
    onEdits(next);
    setError("");
  }
  function exportRows() {
    const content = csv([
      [
        "Marca",
        "Categoria",
        "Linha",
        "Tecnologia",
        "Material",
        "Índice",
        "Tratamento",
        "Preço normal (R$)",
        "Preço promocional (R$)",
        "Preço no simulador (R$)",
        "Ativa",
      ],
      ...rows.map((r) => [
        r.brand,
        r.category,
        r.line,
        r.option,
        r.material,
        r.index,
        r.treatment,
        lensDecimal(r.priceCents),
        r.promotionPriceCents === null
          ? ""
          : lensDecimal(r.promotionPriceCents),
        lensDecimal(r.promotionPriceCents ?? r.priceCents),
        r.enabled ? "Sim" : "Não",
      ]),
    ]);
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lentes-ocular.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const numericAction = action === "promotion" || action === "adjust";
  const actionLabel = {
    hide: "Ocultar",
    show: "Ativar",
    promotion: `Aplicar desconto de ${percent}% a`,
    remove: "Encerrar promoções de",
    adjust: `Reajustar em ${percent}%`,
  }[action];
  if (!data)
    return (
      <div className="admin-empty" role="status">
        {busy
          ? "Carregando a tabela de lentes…"
          : "A tabela de lentes não foi carregada. Use Atualizar para tentar novamente."}
      </div>
    );
  return (
    <>
      <p className="admin-page-description">
        Controle as opções exibidas no simulador, seus preços e promoções.
        Ocultar preserva o cadastro.
      </p>
      <div className="admin-filter-bar admin-lens-filters">
        <input
          aria-label="Buscar lentes"
          type="search"
          placeholder="Linha, material ou tratamento"
          maxLength={300}
          value={filter.query || ""}
          onChange={(e) => changeFilter({ ...filter, query: e.target.value })}
        />
        <select
          aria-label="Filtrar marca da lente"
          value={filter.brand || ""}
          onChange={(e) =>
            changeFilter({
              ...filter,
              brand: e.target.value,
              category: "",
              line: "",
            })
          }
        >
          <option value="">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar categoria da lente"
          value={filter.category || ""}
          onChange={(e) =>
            changeFilter({ ...filter, category: e.target.value, line: "" })
          }
        >
          <option value="">Todos os tipos</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar linha da lente"
          value={filter.line || ""}
          onChange={(e) => changeFilter({ ...filter, line: e.target.value })}
        >
          <option value="">Todas as linhas</option>
          {lines.map((line) => (
            <option key={line}>{line}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar situação da lente"
          value={filter.status || "all"}
          onChange={(e) =>
            changeFilter({
              ...filter,
              status: e.target.value as LensFilter["status"],
            })
          }
        >
          <option value="all">Todas as situações</option>
          <option value="active">Ativas</option>
          <option value="hidden">Ocultas</option>
          <option value="promotion">Em promoção</option>
        </select>
        <button
          type="button"
          onClick={exportRows}
          disabled={!rows.length || busy || !!pending}
          title={
            pending
              ? "Salve ou descarte as alterações antes de exportar."
              : undefined
          }
        >
          Exportar CSV
        </button>
      </div>
      <form
        className="admin-lens-bulk"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(percent);
          if (
            numericAction &&
            (!Number.isFinite(value) ||
              (action === "promotion"
                ? value < 0.1 || value > 99
                : value < -99 || value > 200))
          ) {
            setError("Confira o percentual informado.");
            return;
          }
          if (pending || !rows.length || busy) return;
          const scope =
            [
              filter.brand,
              filter.category,
              filter.line,
              filter.query ? `busca: ${filter.query}` : "",
              filter.status !== "all"
                ? {
                    active: "ativas",
                    hidden: "ocultas",
                    promotion: "em promoção",
                  }[filter.status!]
                : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Todas as marcas e linhas";
          if (
            !window.confirm(
              `${actionLabel} ${rows.length} configurações?\n${scope}\n${action === "promotion" ? "O desconto usa o preço normal e substitui as promoções deste filtro.\n" : ""}A mudança será publicada no simulador.`,
            )
          )
            return;
          const bulk: LensBulkAction =
            action === "hide" || action === "show"
              ? { type: "visibility", enabled: action === "show" }
              : action === "adjust"
                ? { type: "adjust", percent: value }
                : {
                    type: "promotion",
                    percent: action === "remove" ? null : value,
                  };
          void onBulk(filter, bulk, rows.length);
        }}
      >
        <fieldset disabled={busy || !!pending}>
          <legend>Ações nos resultados filtrados</legend>
          <div className="admin-lens-adjust">
            <select
              aria-label="Ação em lote nas lentes"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPercent("10");
              }}
            >
              <option value="hide">Ocultar no simulador</option>
              <option value="show">Ativar no simulador</option>
              <option value="promotion">Aplicar desconto</option>
              <option value="remove">Encerrar promoções</option>
              <option value="adjust">Reajustar preço normal</option>
            </select>
            {numericAction && (
              <div className="admin-lens-percent">
                <label htmlFor="lens-bulk-percent">
                  {action === "promotion" ? "Desconto (%)" : "Reajuste (%)"}
                </label>
                <input
                  id="lens-bulk-percent"
                  type="number"
                  min={action === "promotion" ? 0.1 : -99}
                  max={action === "promotion" ? 99 : 200}
                  step="0.1"
                  required
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </div>
            )}
            <button disabled={busy || !!pending || !rows.length}>
              Aplicar ao filtro
            </button>
            <span>
              {rows.length} configurações ·{" "}
              {rows.filter((r) => r.enabled).length} ativas
            </span>
          </div>
        </fieldset>
        {pending > 0 && (
          <p className="store-muted">
            Salve ou descarte as edições individuais antes de aplicar uma ação
            em lote.
          </p>
        )}
        {action === "promotion" && (
          <p className="store-muted">
            O desconto usa o preço normal e substitui as promoções do filtro.
            Não ativa lentes ocultas.
          </p>
        )}
      </form>
      {error && (
        <p role="alert" className="store-error">
          {error}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table admin-lenses-table">
          <thead>
            <tr>
              <th>Linha / configuração</th>
              <th>Tratamento</th>
              <th>Preço normal (R$)</th>
              <th>Promocional (R$)</th>
              <th>No simulador</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((currentPage - 1) * 20, currentPage * 20).map((r) => {
              const draft = edits[r.id];
              const label = `${r.line}, ${r.option}, ${r.treatment}, ${r.material} ${r.index}`;
              const active = draft?.enabled ?? r.enabled;
              const {
                promotion: promo,
                regular,
                promotional,
                valid,
              } = prices(r);
              return (
                <tr
                  key={r.id}
                  className={!active ? "admin-lens-hidden" : undefined}
                >
                  <td>
                    <strong>{r.line}</strong>
                    <small>
                      {r.brand} · {r.category}
                    </small>
                    <span>{r.option}</span>
                    <small>
                      {r.material} {r.index}
                    </small>
                  </td>
                  <td>{r.treatment}</td>
                  <td>
                    <input
                      className="admin-lens-price"
                      aria-label={`Preço normal de ${label}`}
                      aria-invalid={!valid}
                      inputMode="decimal"
                      disabled={busy}
                      value={draft?.price ?? lensDecimal(r.priceCents)}
                      onChange={(e) => edit(r, { price: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-lens-price"
                      aria-label={`Preço promocional de ${label}`}
                      aria-invalid={!valid}
                      inputMode="decimal"
                      placeholder="Sem promoção"
                      disabled={busy}
                      value={promo}
                      onChange={(e) => edit(r, { promotion: e.target.value })}
                    />
                    <small>
                      {valid
                        ? promotional === null
                          ? ""
                          : `${Math.round((1 - promotional / regular) * 100)}% de desconto`
                        : "Confira os preços"}
                    </small>
                  </td>
                  <td>
                    <label className="store-checkbox admin-lens-switch">
                      <input
                        type="checkbox"
                        aria-label={`Exibir ${label} no simulador`}
                        checked={active}
                        disabled={busy}
                        onChange={(e) => edit(r, { enabled: e.target.checked })}
                      />
                      <span>{active ? "Ativa" : "Oculta"}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <div className="admin-empty">
            {busy ? "Carregando a tabela…" : "Nenhuma configuração encontrada."}
          </div>
        )}
      </div>
      <p className="store-muted admin-lens-hint">
        Deixe o preço promocional vazio para encerrar a oferta. Valores por par.
      </p>
      <div className="admin-pagination">
        <span>
          {rows.length} registros · página {currentPage} de {pages}
        </span>
        <div>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
      <div className="admin-lens-save">
        <div>
          <span>{pending} configurações alteradas</span>
          {invalidEdits > 0 && (
            <small role="alert" className="admin-lens-validation">
              Confira {invalidEdits}{" "}
              {invalidEdits === 1 ? "configuração" : "configurações"}: o preço
              deve ficar entre R$ 0,01 e R$ 100.000,00; a promoção, abaixo do
              normal.
            </small>
          )}
        </div>
        <div className="admin-form-actions">
          <button
            type="button"
            disabled={busy || !pending}
            onClick={() => onEdits({})}
          >
            Descartar
          </button>
          <button
            type="button"
            className="button"
            disabled={busy || !pending || invalidEdits > 0}
            onClick={() => void onSave()}
          >
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
}
