"use client";
import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/currency";
import { whatsapp } from "@/lib/product";
import LensBrands from "./LensBrands";
interface LensConfig {
  m: string;
  i?: string;
  t: string;
  p: number;
  e?: string;
}
type LensData = Record<
  string,
  Record<string, Record<string, Record<string, LensConfig[]>>>
>;
const groups = [
  {
    id: "simples",
    title: "Visão simples",
    description: "Uma distância de visão",
    match: ["Visão Simples", "Monofocal", "Mono Plus"],
  },
  {
    id: "progressiva",
    title: "Progressivas",
    description: "Perto, intermediário e longe",
    match: ["Progressiva"],
  },
  {
    id: "ocupacional",
    title: "Ocupacionais",
    description: "Leitura e trabalho",
    match: ["Ocupacional"],
  },
  {
    id: "especiais",
    title: "Outras opções",
    description: "Tecnologias e usos específicos",
    match: [
      "Controle",
      "Especial",
      "Bifocal",
      "Lentes Prontas",
      "Netline",
      "AdaptiveSun",
      "Asiana",
    ],
  },
];
const materialNames: Record<string, string> = {
  ORGANIC: "Orgânico (resina)",
  POLI: "Policarbonato",
};
const materialLabel = (value: string) => materialNames[value] || value;
export default function LensSimulator({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const Title = standalone ? "h1" : "h2";
  const [data, setData] = useState<LensData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState("simples");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("");
  const [treatment, setTreatment] = useState("");
  const [technology, setTechnology] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const group = groups.find((g) => g.id === groupId)!;
  function go(next: number) {
    setStep(next);
    setQuery("");
    setMaterial("");
    setTreatment("");
    setTechnology("");
    if (next < 3) setBrand("");
    if (next < 4) {
      setProduct("");
      setCategory("");
    }
    requestAnimationFrame(() => {
      if (body.current) body.current.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    });
  }
  async function start() {
    setLoading(true);
    setError("");
    try {
      if (!data) {
        const r = await fetch("/assets/lentes-data.json");
        if (!r.ok) throw new Error();
        setData(await r.json());
      }
      go(1);
    } catch {
      setError("Não foi possível carregar as opções. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }
  const matches = (cat: string) => group.match.some((m) => cat.includes(m));
  const products =
    data && brand
      ? Object.entries(data[brand] || {})
          .filter(([cat]) => matches(cat))
          .flatMap(([cat, ps]) =>
            Object.entries(ps).map(([name, options]) => ({
              cat,
              name,
              options,
              min: Math.min(
                ...Object.values(options)
                  .flat()
                  .filter((c) => Number.isFinite(c.p) && c.p > 0)
                  .map((c) => c.p),
              ),
            })),
          )
          .filter((p) => Number.isFinite(p.min))
          .sort((a, b) => a.min - b.min)
      : [];
  const configs =
    data && brand && product
      ? Object.entries(data[brand]?.[category]?.[product] || {}).flatMap(
          ([option, rows]) =>
            rows
              .filter((c) => Number.isFinite(c.p) && c.p > 0)
              .map((c) => ({ ...c, option })),
        )
      : [];
  const filtered = configs
    .filter(
      (c) =>
        (!material || c.m === material) &&
        (!treatment || c.t === treatment) &&
        (!technology || c.option === technology),
    )
    .sort((a, b) => a.p - b.p);
  const brands = data
    ? Object.keys(data).filter((b) => Object.keys(data[b]).some(matches))
    : [];
  const titles = [
    "Compare lentes e preços.",
    "Como você usa sua visão?",
    "Escolha a marca.",
    "Encontre uma linha.",
    "Compare as configurações.",
  ];
  return (
    <section
      className="store-lens-simulator"
      id="simulador"
      aria-label="Simulador de lentes"
    >
      <header className="store-lens-intro">
        <p className="eyebrow">Lentes</p>
        <Title>
          Lentes para
          <br />
          <em>a sua rotina.</em>
        </Title>
        <p>
          Compare marcas, materiais e tratamentos de acordo com sua receita.
        </p>
        <LensBrands />
        <p className="store-lens-note">
          Valores estimados por par. O orçamento depende da receita e da
          armação.
        </p>
      </header>
      <div className="store-simulator-panel">
        <div className="store-simulator-top">
          <span className="eyebrow">
            {step ? `Etapa ${step} de 4` : "Simulador de lentes"}
          </span>
          {step > 0 && (
            <button
              type="button"
              className="store-clear-link"
              onClick={() => go(step === 1 ? 0 : step - 1)}
            >
              Voltar
            </button>
          )}
        </div>
        <h3 ref={heading} tabIndex={-1}>
          {titles[step]}
        </h3>
        <div ref={body} className="store-simulator-body">
          {step > 1 && (
            <p className="store-sim-breadcrumb">
              {[group.title, step > 2 ? brand : "", step > 3 ? product : ""]
                .filter(Boolean)
                .join(" / ")}
            </p>
          )}
          {step === 0 && (
            <>
              <p>
                Escolha o tipo de lente e explore as opções para a sua rotina.
              </p>
              <button
                type="button"
                className="button"
                onClick={start}
                disabled={loading}
              >
                {loading ? "Carregando opções…" : "Simular lentes e preços"}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="store-error">
              {error}
            </p>
          )}
          {step === 1 && (
            <div className="store-lens-options">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGroupId(g.id);
                    go(2);
                  }}
                >
                  <strong>{g.title}</strong>
                  <span>{g.description}</span>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="store-lens-options">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBrand(b);
                    go(3);
                  }}
                >
                  <strong>{b}</strong>
                  <span>
                    {[
                      "Varilux",
                      "Eyezen",
                      "Essilor",
                      "Stellest",
                      "KODAK",
                    ].includes(b)
                      ? "Linhas Essilor"
                      : "Explorar as linhas"}
                  </span>
                </button>
              ))}
              {!brands.length && (
                <p>Converse com a equipe sobre as opções para este uso.</p>
              )}
            </div>
          )}
          {step === 3 && (
            <>
              <label className="store-search-label" htmlFor="lens-search">
                Buscar linha de lente
              </label>
              <input
                id="lens-search"
                type="search"
                placeholder="Buscar pelo nome da linha"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="store-lens-results">
                {products
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      key={`${p.cat}-${p.name}`}
                      className="store-lens-product"
                      type="button"
                      onClick={() => {
                        setProduct(p.name);
                        setCategory(p.cat);
                        go(4);
                      }}
                    >
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.cat}</small>
                      </span>
                      <span>
                        <small>A partir de</small>
                        <strong className="store-price">
                          {formatCurrency(p.min)}
                        </strong>
                      </span>
                    </button>
                  ))}
                {!products.length && (
                  <p>Os valores desta marca são informados pelo atendimento.</p>
                )}
                {products.length > 0 &&
                  !products.some((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  ) && (
                    <p role="status">
                      Nenhuma linha encontrada. Tente outro nome.
                    </p>
                  )}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <div className="store-lens-controls">
                <div>
                  <label htmlFor="lens-material">Material</label>
                  <select
                    id="lens-material"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {[...new Set(configs.map((c) => c.m))].map((m) => (
                      <option key={m} value={m}>
                        {materialLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="lens-treatment">Tratamento</label>
                  <select
                    id="lens-treatment"
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {[...new Set(configs.map((c) => c.t))].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="store-muted" role="status">
                {filtered.length}{" "}
                {filtered.length === 1 ? "configuração" : "configurações"} ·
                valores por par
              </p>
              <div className="store-field">
                <label htmlFor="lens-technology">Cor e tecnologia</label>
                <select
                  id="lens-technology"
                  value={technology}
                  onChange={(e) => setTechnology(e.target.value)}
                >
                  <option value="">Todas</option>
                  {[...new Set(configs.map((c) => c.option))].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              {(material || treatment || technology) && (
                <button
                  type="button"
                  className="store-clear-link"
                  onClick={() => {
                    setMaterial("");
                    setTreatment("");
                    setTechnology("");
                  }}
                >
                  Limpar comparação
                </button>
              )}
              <div className="store-lens-results">
                {filtered.map((c, i) => (
                  <article
                    className="store-lens-config"
                    key={`${c.option}-${c.m}-${c.t}-${c.i}-${i}`}
                  >
                    <div>
                      <span className="eyebrow">{c.option}</span>
                      <strong>
                        {materialLabel(c.m)}
                        {c.i ? ` · índice ${c.i.replace(".", ",")}` : ""}
                      </strong>
                      <p>{c.t}</p>
                      {c.e && <small>Faixa informada: {c.e}</small>}
                    </div>
                    <div>
                      <p className="store-price">{formatCurrency(c.p)}</p>
                      <span className="store-muted">o par</span>
                    </div>
                    <a
                      href={whatsapp(
                        `Olá! Gostaria de um orçamento para lentes ${brand} ${product}, ${c.option}, material ${c.m}${c.i ? " índice " + c.i : ""}, tratamento ${c.t}. Vi o valor de referência de ${formatCurrency(c.p)} por par no simulador. Podem avaliar a compatibilidade com minha receita e armação?`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Consultar ${product}, ${c.m}, ${c.t}, ${formatCurrency(c.p)}`}
                    >
                      Consultar esta opção
                    </a>
                  </article>
                ))}
                {!filtered.length && (
                  <p>
                    Nenhuma combinação encontrada. Experimente outro filtro.
                  </p>
                )}
              </div>
              <p className="store-lens-note">
                Traga sua receita à loja para avaliar a lente e a armação.
              </p>
            </>
          )}
        </div>
        <a
          className="store-sim-contact"
          href={whatsapp(
            `Olá! Gostaria de orientação para escolher minhas lentes${brand ? " " + brand : ""}${product ? " " + product : ""}.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          Preciso de ajuda para escolher
        </a>
      </div>
    </section>
  );
}
