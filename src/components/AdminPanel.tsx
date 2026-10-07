"use client";
import { useEffect, useState } from "react";
import type { Product, Order, Variant } from "@/lib/types";
import ProductImage from "./ProductImage";
import { formatCurrency } from "@/lib/currency";
import { canSell } from "@/lib/product";
async function api(path: string, options?: RequestInit) {
  const r = await fetch(path, options);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Não foi possível concluir.");
  return d;
}
export default function AdminPanel() {
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const [p, o] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/orders"),
    ]);
    setProducts(p.products);
    setOrders(o.orders);
  }
  useEffect(() => {
    let live = true;
    api("/api/admin/session")
      .then((d) => {
        if (live) {
          setAuth(d.authenticated);
          setConfigured(d.configured);
        }
        if (d.authenticated)
          return Promise.all([
            api("/api/admin/products"),
            api("/api/admin/orders"),
          ]).then(([p, o]) => {
            if (live) {
              setProducts(p.products);
              setOrders(o.orders);
            }
          });
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password");
    try {
      await api("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setAuth(true);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const d = await api("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      setSelected(d.product);
      await refresh();
      setMessage(
        "Cadastro salvo. A vitrine usa esses dados no próximo carregamento.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function update(patch: Partial<Product>) {
    setSelected((p) => (p ? { ...p, ...patch } : p));
  }
  function variant(index: number, patch: Partial<Variant>) {
    if (selected)
      update({
        variants: selected.variants.map((v, i) =>
          i === index ? { ...v, ...patch } : v,
        ),
      });
  }
  async function upload(file: File | undefined, index: number) {
    if (!file || !selected) return;
    setBusy(true);
    setError("");
    const productId = selected.id;
    try {
      const form = new FormData();
      form.set("image", file);
      const d = await api("/api/admin/media", { method: "POST", body: form });
      setSelected((p) => {
        if (!p || p.id !== productId) return p;
        const images = Array.from(
          { length: Math.max(3, p.images.length) },
          (_, i) =>
            p.images[i] ||
            `/assets/placeholders/${["frontal", "lateral", "detalhe"][i % 3]}.svg`,
        );
        images[index] = d.path;
        return { ...p, images };
      });
      setMessage("Foto preparada em 4:3. Salve o cadastro para publicá-la.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ready = products.filter(canSell).length;
  return (
    <main id="conteudo" className="store-page admin-page">
      <div className="store-page-heading">
        <p className="eyebrow">Operação da loja</p>
        <h1>
          Painel <em>Ocular.</em>
        </h1>
      </div>
      {loading ? (
        <p role="status">Carregando…</p>
      ) : !auth ? (
        <form onSubmit={signIn} className="store-form admin-login">
          <h2>Acesso da equipe</h2>
          {!configured && (
            <p>
              O acesso precisa ser configurado pelo responsável pelo servidor.
              Consulte o guia de operação do projeto.
            </p>
          )}
          <div className="store-field">
            <label htmlFor="admin-password">Senha de acesso</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="button" disabled={busy}>
            Entrar
          </button>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <div
              className="admin-tabs"
              role="group"
              aria-label="Seções do painel"
            >
              {[
                ["products", "Catálogo"],
                ["orders", "Solicitações"],
                ["readiness", "Preparação da loja"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tab === id}
                  onClick={() => {
                    setTab(id);
                    setSelected(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="store-clear-link"
              onClick={async () => {
                await api("/api/admin/session", { method: "DELETE" });
                setAuth(false);
                setSelected(null);
                setProducts([]);
                setOrders([]);
              }}
            >
              Sair
            </button>
          </div>
          {tab === "products" && (
            <>
              <div className="admin-catalog-toolbar">
                <label className="sr-only" htmlFor="admin-search">
                  Buscar no catálogo
                </label>
                <input
                  id="admin-search"
                  type="search"
                  placeholder="Buscar modelo ou marca"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    const id = `novo-modelo-${Date.now()}`;
                    setSelected({
                      id,
                      slug: id,
                      revision: 0,
                      name: "Novo modelo",
                      category: "grau",
                      brand: "",
                      description: "Descrição do produto a preencher.",
                      material: "",
                      features: [],
                      tags: [],
                      images: [],
                      verified: false,
                      priceConfirmed: false,
                      published: false,
                      package: null,
                      variants: [
                        {
                          id: `${id}-variante`,
                          sku: "",
                          label: "Cor e tamanho",
                          color: "",
                          lensWidth: null,
                          bridge: null,
                          temple: null,
                          priceCents: 1,
                          stock: 0,
                        },
                      ],
                    });
                  }}
                >
                  Cadastrar modelo
                </button>
              </div>
              {selected ? (
                <section className="admin-editor">
                  <div className="admin-editor-top">
                    <h2>{selected.name}</h2>
                    <button
                      type="button"
                      className="store-clear-link"
                      onClick={() => setSelected(null)}
                    >
                      Voltar ao catálogo
                    </button>
                  </div>
                  <div className="admin-fields">
                    <div className="store-field">
                      <label htmlFor="p-name">Nome</label>
                      <input
                        id="p-name"
                        value={selected.name}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                    </div>
                    <div className="store-field">
                      <label htmlFor="p-brand">Marca</label>
                      <input
                        id="p-brand"
                        value={selected.brand}
                        onChange={(e) => update({ brand: e.target.value })}
                      />
                    </div>
                    <div className="store-field">
                      <label htmlFor="p-category">Coleção</label>
                      <select
                        id="p-category"
                        value={selected.category}
                        onChange={(e) =>
                          update({
                            category: e.target.value as Product["category"],
                          })
                        }
                      >
                        <option value="grau">Óculos de grau</option>
                        <option value="sol">Óculos de sol</option>
                      </select>
                    </div>
                    <div className="store-field">
                      <label htmlFor="p-material">Material</label>
                      <input
                        id="p-material"
                        value={selected.material}
                        onChange={(e) => update({ material: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="store-field">
                    <label htmlFor="p-description">Descrição</label>
                    <textarea
                      id="p-description"
                      rows={4}
                      value={selected.description}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </div>
                  <h3>Fotografias do modelo · 4:3</h3>
                  <p className="store-muted">
                    JPG, PNG ou WebP. Recomendado: 1600 × 1200 px. Fundo neutro,
                    produto inteiro e margens consistentes.
                  </p>
                  <div className="admin-photo-slots">
                    {(["frontal", "lateral", "detalhe"] as const).map(
                      (view, i) => (
                        <div key={view}>
                          <div className="admin-photo">
                            <ProductImage
                              src={selected.images[i]}
                              alt={`${selected.name}, ${view}`}
                              view={view}
                            />
                          </div>
                          <label htmlFor={`photo-${i}`}>Foto {view}</label>
                          <input
                            id={`photo-${i}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(e) => upload(e.target.files?.[0], i)}
                          />
                        </div>
                      ),
                    )}
                  </div>
                  <h3>Variantes, preço e estoque</h3>
                  {selected.variants.map((v, i) => (
                    <fieldset key={v.id} className="admin-variant">
                      <legend>Variante {i + 1}</legend>
                      <div className="admin-fields">
                        {[
                          ["label", "Identificação"],
                          ["sku", "SKU"],
                          ["color", "Cor"],
                        ].map(([key, label]) => (
                          <div className="store-field" key={key}>
                            <label htmlFor={`${v.id}-${key}`}>{label}</label>
                            <input
                              id={`${v.id}-${key}`}
                              value={v[key as "label" | "sku" | "color"]}
                              onChange={(e) =>
                                variant(i, { [key]: e.target.value })
                              }
                            />
                          </div>
                        ))}
                        <div className="store-field">
                          <label htmlFor={`${v.id}-price`}>Preço (R$)</label>
                          <input
                            id={`${v.id}-price`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={v.priceCents / 100}
                            onChange={(e) =>
                              variant(i, {
                                priceCents: Math.round(
                                  Number(e.target.value) * 100,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="store-field">
                          <label htmlFor={`${v.id}-stock`}>
                            Estoque disponível
                          </label>
                          <input
                            id={`${v.id}-stock`}
                            type="number"
                            min="0"
                            step="1"
                            value={v.stock}
                            onChange={(e) =>
                              variant(i, { stock: Number(e.target.value) })
                            }
                          />
                        </div>
                        {[
                          ["lensWidth", "Lente (mm)"],
                          ["bridge", "Ponte (mm)"],
                          ["temple", "Haste (mm)"],
                        ].map(([key, label]) => (
                          <div className="store-field" key={key}>
                            <label htmlFor={`${v.id}-${key}`}>{label}</label>
                            <input
                              id={`${v.id}-${key}`}
                              type="number"
                              min="1"
                              max="250"
                              value={
                                v[key as "lensWidth" | "bridge" | "temple"] ??
                                ""
                              }
                              onChange={(e) =>
                                variant(i, {
                                  [key]: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                      {selected.variants.length > 1 && (
                        <button
                          type="button"
                          className="store-remove"
                          onClick={() =>
                            update({
                              variants: selected.variants.filter(
                                (_, index) => index !== i,
                              ),
                            })
                          }
                        >
                          Remover variante
                        </button>
                      )}
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="store-clear-link"
                    onClick={() =>
                      update({
                        variants: [
                          ...selected.variants,
                          {
                            ...selected.variants[0],
                            id: `${selected.id}-${Date.now()}`,
                            sku: "",
                            label: "Nova variante",
                            stock: 0,
                          },
                        ],
                      })
                    }
                  >
                    + Adicionar variante
                  </button>
                  <div className="admin-validation">
                    {[
                      ["published", "Exibir no catálogo"],
                      ["priceConfirmed", "Preço confirmado pela loja"],
                      [
                        "verified",
                        "Fotos, ficha e variantes conferidas pela loja",
                      ],
                    ].map(([key, label]) => (
                      <label className="store-checkbox" key={key}>
                        <input
                          type="checkbox"
                          checked={
                            selected[
                              key as "published" | "priceConfirmed" | "verified"
                            ]
                          }
                          onChange={(e) => update({ [key]: e.target.checked })}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                    <p className="store-muted">
                      A validação exige três fotos diferentes, material, SKU,
                      cor, medidas e preço confirmado. O pagamento permanece
                      desativado nesta etapa.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={save}
                  >
                    {busy ? "Salvando…" : "Salvar cadastro"}
                  </button>
                </section>
              ) : (
                <div className="admin-products">
                  {products
                    .filter((p) =>
                      `${p.name} ${p.brand}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="admin-product-row"
                        onClick={() => {
                          setSelected(structuredClone(p));
                          setMessage("");
                          setError("");
                        }}
                      >
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {p.brand} · {p.category === "grau" ? "Grau" : "Sol"}{" "}
                            · {p.variants.length} variante(s)
                          </small>
                        </span>
                        <span
                          className={`store-status-pill ${canSell(p) ? "is-ready" : ""}`}
                        >
                          {canSell(p) ? "Validado" : "Pendente"}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
          {tab === "orders" && (
            <section>
              <div className="store-section-top">
                <h2>Solicitações de atendimento</h2>
                <button
                  type="button"
                  className="store-clear-link"
                  onClick={() => refresh().catch((e) => setError(e.message))}
                >
                  Atualizar lista
                </button>
              </div>
              {!orders.length ? (
                <p>Nenhuma solicitação registrada.</p>
              ) : (
                orders.map((o) => (
                  <article className="admin-order" key={o.id}>
                    <div className="store-section-top">
                      <h3>{o.number}</h3>
                      <span className="store-status-pill">
                        {o.status === "quote_requested"
                          ? "Orçamento solicitado"
                          : o.status}
                      </span>
                    </div>
                    <p>
                      {o.customer.name} ·{" "}
                      <a href={`mailto:${o.customer.email}`}>
                        {o.customer.email}
                      </a>{" "}
                      ·{" "}
                      <a href={`tel:+55${o.customer.phone}`}>
                        {o.customer.phone}
                      </a>
                    </p>
                    <p className="store-muted">
                      {new Date(o.createdAt).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}{" "}
                      · retirada a combinar
                    </p>
                    {o.items.map((i) => (
                      <div
                        key={`${i.productId}-${i.variantId}`}
                        className="store-review-item"
                      >
                        <span>
                          {i.quantity} × {i.name}
                          <small>{i.variantLabel}</small>
                        </span>
                        <span className="store-price">
                          {formatCurrency((i.priceCents * i.quantity) / 100)}
                        </span>
                      </div>
                    ))}
                    <p>
                      Subtotal de referência:{" "}
                      <strong className="store-price">
                        {formatCurrency(o.subtotalCents / 100)}
                      </strong>
                    </p>
                    <p className="store-muted">
                      Nenhuma cobrança realizada. Confirme orçamento e
                      disponibilidade no atendimento.
                    </p>
                  </article>
                ))
              )}
            </section>
          )}
          {tab === "readiness" && (
            <section className="admin-readiness">
              <h2>Preparação para a venda</h2>
              <dl className="store-specs">
                <div>
                  <dt>Produtos cadastrados</dt>
                  <dd>{products.length}</dd>
                </div>
                <div>
                  <dt>Produtos validados</dt>
                  <dd>{ready}</dd>
                </div>
                <div>
                  <dt>Cadastros a conferir</dt>
                  <dd>{products.length - ready}</dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>Provedor a definir com o cliente</dd>
                </div>
                <div>
                  <dt>Entrega</dt>
                  <dd>Retirada na loja</dd>
                </div>
                <div>
                  <dt>Lentes de grau</dt>
                  <dd>Orçamento e atendimento separados</dd>
                </div>
                <div>
                  <dt>Notificações</dt>
                  <dd>Solicitações registradas no painel</dd>
                </div>
              </dl>
              <p>
                Antes de ativar cobranças: validar o catálogo, definir o
                provedor, homologar a integração e aprovar as políticas
                comerciais. O contrato de integração e os cenários de
                estoque/pedido já estão preparados no projeto.
              </p>
            </section>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="store-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="store-success">
          {message}
        </p>
      )}
    </main>
  );
}
