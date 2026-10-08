"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Product, Variant, Order } from "@/lib/types";
import type { dashboard } from "@/lib/admin";
import type { LensRow } from "@/lib/lenses";
import { formatCurrency } from "@/lib/currency";
import { canSell, minPrice, productHref } from "@/lib/product";
import {
  activityLabels,
  csv,
  normalizeSearch,
  productIssues,
  serviceLabels,
} from "@/lib/admin-utils";
import AdminProductEditor from "./AdminProductEditor";
import ProductImage from "./ProductImage";

type Dashboard = Awaited<ReturnType<typeof dashboard>>;
type AdminOrder = Omit<Order, "token" | "idempotencyKey">;
type Tab =
  | "overview"
  | "products"
  | "inventory"
  | "orders"
  | "customers"
  | "lenses"
  | "activity"
  | "settings";
const tabs: [Tab, string][] = [
  ["overview", "Visão geral"],
  ["products", "Catálogo"],
  ["inventory", "Preços e estoque"],
  ["orders", "Atendimentos"],
  ["customers", "Clientes"],
  ["lenses", "Lentes"],
  ["activity", "Histórico"],
  ["settings", "Operação"],
];
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
const money = (value: number) => formatCurrency(value / 100);
const decimal = (value: number) => (value / 100).toFixed(2).replace(".", ",");
const cents = (value: string) =>
  /^\d+(?:[.,]\d{1,2})?$/.test(value.trim())
    ? Math.round(Number(value.replace(",", ".")) * 100)
    : NaN;
const slug = (value: string) =>
  normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 85);
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  const data = await response
    .json()
    .catch(() => ({ error: "Não foi possível concluir. Tente novamente." }));
  if (!response.ok) {
    const labels: Record<string, string> = {
      name: "nome (3 a 150 caracteres)",
      brand: "marca",
      description: "descrição (10 a 4.000 caracteres)",
      slug: "endereço do modelo",
      material: "material",
      images: "fotografias",
      features: "características",
      tags: "palavras-chave",
      sku: "SKU",
      label: "nome da variante",
      color: "cor",
      lensWidth: "largura da lente",
      bridge: "ponte",
      temple: "haste",
      stock: "estoque (número inteiro)",
      priceCents: "preço (R$ 0,01 a R$ 100.000,00)",
      reason: "motivo (3 a 300 caracteres)",
      note: "observações (até 4.000 caracteres)",
    };
    const fields = Array.isArray(data.fields)
      ? (data.fields as { path: string }[])
      : [];
    const names = [
      ...new Set(
        fields
          .map((field) => labels[field.path.split(".").at(-1) || ""])
          .filter(Boolean),
      ),
    ];
    throw new ApiError(
      names.length
        ? `Confira: ${names.join(", ")}.`
        : data.error || "Não foi possível concluir.",
      response.status,
    );
  }
  return data as T;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
function download(name: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(
    new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}
function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="admin-pagination">
      <span>
        {total} registros · página {page} de {pages}
      </span>
      <div>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
export default function AdminPanel() {
  const [auth, setAuth] = useState(false),
    [loading, setLoading] = useState(true),
    [configured, setConfigured] = useState(true);
  const [data, setData] = useState<Dashboard | null>(null),
    [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [brandFilter, setBrandFilter] = useState(""),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null),
    [baseline, setBaseline] = useState(""),
    [slugEdited, setSlugEdited] = useState(false),
    [checked, setChecked] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null),
    [orderBaseline, setOrderBaseline] = useState("");
  const [inventory, setInventory] = useState<{
    product: Product;
    variant: Variant;
    price: string;
    stock: string;
    reason: string;
  } | null>(null);
  const [lensData, setLensData] = useState<{
      revision: number;
      rows: LensRow[];
    } | null>(null),
    [lensEdits, setLensEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const products = data?.products || [],
    orders = data?.orders || [];
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const dirty =
    (!!selected && JSON.stringify(selected) !== baseline) ||
    (!!selectedOrder && JSON.stringify(selectedOrder) !== orderBaseline) ||
    Object.keys(lensEdits).length > 0 ||
    !!inventory;
  const fail = useCallback((value: unknown) => {
    setError(
      value instanceof Error ? value.message : "Não foi possível concluir.",
    );
    if (value instanceof ApiError && value.status === 401) {
      setAuth(false);
      setData(null);
      setSelected(null);
      setSelectedOrder(null);
      setInventory(null);
      setLensEdits({});
    }
  }, []);
  const refresh = useCallback(async () => {
    setData(await api<Dashboard>("/api/admin/dashboard"));
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = await api<{ authenticated: boolean; configured: boolean }>(
          "/api/admin/session",
        );
        if (!live) return;
        setAuth(s.authenticated);
        setConfigured(s.configured);
        if (s.authenticated) {
          const d = await api<Dashboard>("/api/admin/dashboard");
          if (live) setData(d);
        }
      } catch (e) {
        if (live) fail(e);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [fail]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function canLeave() {
    return (
      !dirty || window.confirm("Há alterações sem salvar. Deseja descartá-las?")
    );
  }
  function clearEditor() {
    setSelected(null);
    setSelectedOrder(null);
    setInventory(null);
    setLensEdits({});
    setBaseline("");
    setOrderBaseline("");
  }
  async function work(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function navigate(next: Tab) {
    if (busy || !canLeave()) return;
    clearEditor();
    setTab(next);
    setQuery("");
    setFilter("all");
    setBrandFilter("");
    setPage(1);
    setChecked([]);
    setMessage("");
    setError("");
    if (next === "lenses" && !lensData)
      await work(async () => {
        setLensData(await api("/api/admin/lenses"));
      });
  }
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = new FormData(form).get("password");
    await work(async () => {
      await api("/api/admin/session", json("POST", { password }));
      form.reset();
      setAuth(true);
      await refresh();
    });
  }
  function edit(product: Product) {
    if (busy || !canLeave()) return;
    const next = structuredClone(product);
    setSelected(next);
    setBaseline(JSON.stringify(next));
    setSlugEdited(false);
    setMessage("");
    setError("");
  }
  function create(copy?: Product) {
    if (!canLeave()) return;
    const id = `modelo-${crypto.randomUUID()}`;
    const p: Product = copy
      ? {
          ...structuredClone(copy),
          id,
          slug: `${slug(copy.name)}-${id.slice(-6)}`,
          name: `${copy.name.slice(0, 142)} · cópia`,
          revision: 0,
          published: false,
          verified: false,
          variants: copy.variants.map((v, i) => ({
            ...v,
            id: `${id}-${i}`,
            sku: "",
            stock: 0,
          })),
        }
      : {
          id,
          slug: `novo-modelo-${id.slice(-6)}`,
          revision: 0,
          name: "Novo modelo",
          category: "grau",
          brand: "",
          description: "",
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
              id: `${id}-0`,
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
        };
    setSelected(p);
    setBaseline(JSON.stringify(p));
    setSlugEdited(false);
    setMessage("");
    setError("");
  }
  function update(patch: Partial<Product>) {
    if (patch.slug !== undefined) setSlugEdited(true);
    setSelected((p) =>
      p
        ? {
            ...p,
            ...patch,
            ...(patch.name && p.revision === 0 && !slugEdited
              ? { slug: `${slug(patch.name)}-${p.id.slice(-6)}` }
              : {}),
          }
        : p,
    );
  }
  function variant(index: number, patch: Partial<Variant>) {
    if (selected)
      update({
        variants: selected.variants.map((v, i) =>
          i === index ? { ...v, ...patch } : v,
        ),
      });
  }
  async function save() {
    if (!selected) return;
    await work(async () => {
      const d = await api<{ product: Product }>(
        "/api/admin/products",
        json("PUT", selected),
      );
      setSelected(d.product);
      setBaseline(JSON.stringify(d.product));
      await refresh();
      setMessage("Cadastro salvo.");
    });
  }
  async function upload(file: File | undefined, index: number) {
    if (!file || !selected) return;
    const id = selected.id;
    await work(async () => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw new Error("Use JPG, PNG ou WebP de até 8 MB.");
      const image = await createImageBitmap(file);
      try {
        if (image.width < 600 || image.height < 450)
          throw new Error("A foto deve ter pelo menos 600 × 450 px.");
        const ratio = Math.min(1, 1600 / image.width, 1200 / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(
          600,
          Math.round(Math.max(image.width, (image.height * 4) / 3) * ratio),
        );
        canvas.height = Math.round((canvas.width * 3) / 4);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível preparar a foto.");
        ctx.fillStyle = "#f6f5f2";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);
        ctx.drawImage(
          image,
          (canvas.width - width) / 2,
          (canvas.height - height) / 2,
          width,
          height,
        );
        const bytes = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error("Não foi possível preparar a foto.")),
            "image/jpeg",
            0.94,
          ),
        );
        const form = new FormData();
        form.set(
          "image",
          new File([bytes], "foto.jpg", { type: "image/jpeg" }),
        );
        const d = await api<{ path: string }>("/api/admin/media", {
          method: "POST",
          body: form,
        });
        setSelected((p) => {
          if (!p || p.id !== id) return p;
          const images = Array.from(
            { length: Math.max(3, p.images.length) },
            (_, i) =>
              p.images[i] ||
              `/assets/placeholders/${["frontal", "lateral", "detalhe"][i % 3]}.svg`,
          );
          images[index] = d.path;
          return { ...p, images };
        });
        setMessage("Foto enviada. Salve o cadastro para usá-la na vitrine.");
      } finally {
        image.close();
      }
    });
  }
  async function visibility(published: boolean) {
    await work(async () => {
      await api(
        "/api/admin/products",
        json("PATCH", {
          published,
          products: products
            .filter((p) => checked.includes(p.id))
            .map(({ id, revision }) => ({ id, revision })),
        }),
      );
      setChecked([]);
      await refresh();
      setMessage(
        published
          ? "Modelos exibidos na vitrine."
          : "Modelos ocultados da vitrine.",
      );
    });
  }
  const matched = (value: string) =>
    normalizeSearch(value).includes(normalizeSearch(query));
  const filteredProducts = products.filter(
    (p) =>
      matched(
        `${p.name} ${p.brand} ${p.variants.map((v) => v.sku).join(" ")}`,
      ) &&
      (!brandFilter || p.brand === brandFilter) &&
      (filter === "all" ||
        (filter === "grau" || filter === "sol"
          ? p.category === filter
          : filter === "draft"
            ? !p.published
            : filter === "pending"
              ? productIssues(p).length > 0
              : canSell(p))),
  );
  const filteredOrders = orders.filter(
    (o) =>
      matched(
        `${o.number} ${o.customer.name} ${o.customer.email} ${o.customer.phone}`,
      ) &&
      (filter === "all" || (o.serviceStatus || "new") === filter),
  );
  const stockRows = products
    .flatMap((p) => p.variants.map((v) => ({ p, v })))
    .filter(
      ({ p, v }) =>
        matched(`${p.name} ${p.brand} ${v.sku} ${v.color}`) &&
        (filter === "all" ||
          (filter === "zero" ? v.stock === 0 : v.stock > 0 && v.stock <= 3)),
    );
  const lensRows = (lensData?.rows || []).filter(
    (r) =>
      (!brandFilter || r.brand === brandFilter) &&
      matched(
        `${r.brand} ${r.category} ${r.line} ${r.option} ${r.material} ${r.index} ${r.treatment}`,
      ),
  );
  const customers = Array.from(
    orders
      .reduce((map, o) => {
        const key = o.customer.phone || o.customer.email.toLowerCase();
        const entry = map.get(key);
        if (entry) entry.orders.push(o);
        else map.set(key, { ...o.customer, orders: [o] });
        return map;
      }, new Map<string, Order["customer"] & { orders: AdminOrder[] }>())
      .values(),
  ).filter((c) => matched(`${c.name} ${c.email} ${c.phone}`));
  const view = <T,>(rows: T[]) => rows.slice((page - 1) * 20, page * 20);
  const pendingOrders = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.serviceStatus || "new"),
  );
  const search = (
    <input
      aria-label="Buscar registros"
      type="search"
      placeholder={
        tab === "products"
          ? "Buscar modelo, marca ou SKU"
          : "Buscar nos registros"
      }
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        setPage(1);
      }}
    />
  );
  function openOrder(o: AdminOrder) {
    setSelectedOrder(structuredClone(o));
    setOrderBaseline(JSON.stringify(o));
    setError("");
    setMessage("");
  }
  if (loading || (auth && !data && !error))
    return (
      <main id="conteudo" className="admin-loading">
        <p className="eyebrow">Óptica Ocular</p>
        <h1>Painel da loja.</h1>
        <p role="status">Carregando seu painel…</p>
      </main>
    );
  if (!auth)
    return (
      <main id="conteudo" className="admin-login-page">
        <div className="admin-login-brand">
          <Link href="/">
            Óptica <em>Ocular.</em>
          </Link>
          <span>Desde 1990 · Curitiba</span>
        </div>
        <form onSubmit={signIn} className="admin-access-card">
          <p className="eyebrow">Operação da loja</p>
          <h1>Acesso da equipe.</h1>
          <p>Produtos, estoque e atendimentos em um só lugar.</p>
          <div className="store-field">
            <label htmlFor="admin-password">Senha de acesso</label>
            <div className="admin-password-field">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={busy}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
          {!configured && (
            <p className="store-error">
              Configure a senha administrativa no servidor para entrar.
            </p>
          )}
          {error && (
            <p role="alert" className="store-error">
              {error}
            </p>
          )}
          <button className="button" disabled={busy || !configured}>
            {busy ? "Entrando…" : "Entrar no painel"}
          </button>
          <Link href="/" className="admin-back-store">
            Voltar à loja
          </Link>
        </form>
        <p className="admin-login-caption">
          Painel exclusivo da equipe Ocular.
        </p>
      </main>
    );
  return (
    <main id="conteudo" className="admin-shell" aria-busy={busy}>
      <aside className="admin-sidebar">
        <Link
          href="/"
          className="admin-brand"
          aria-label="Óptica Ocular, início"
        >
          <Image
            src="/assets/logo-dark.png"
            alt=""
            width={76}
            height={65}
            priority
          />
        </Link>
        <nav aria-label="Seções do painel">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-current={tab === id ? "page" : undefined}
              disabled={busy}
              onClick={() => void navigate(id)}
            >
              {label}
              {id === "orders" && pendingOrders.length > 0 && (
                <span className="admin-nav-count">{pendingOrders.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Abrir a loja
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (canLeave())
                void work(async () => {
                  await api("/api/admin/session", { method: "DELETE" });
                  clearEditor();
                  setAuth(false);
                  setData(null);
                });
            }}
          >
            Sair da conta
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-page-top">
          <div>
            <p className="eyebrow">Óptica Ocular · equipe</p>
            <h1>{tabs.find(([id]) => id === tab)?.[1]}</h1>
          </div>
          <button
            type="button"
            className="admin-secondary"
            disabled={busy}
            onClick={() => {
              if (canLeave())
                void work(async () => {
                  clearEditor();
                  await refresh();
                  if (tab === "lenses")
                    setLensData(await api("/api/admin/lenses"));
                  setMessage("Painel atualizado.");
                });
            }}
          >
            Atualizar
          </button>
        </header>
        {error && (
          <p role="alert" className="store-error admin-notice">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="store-success admin-notice">
            {message}
          </p>
        )}
        {tab === "overview" && (
          <>
            <p className="admin-page-description">
              O movimento da loja e o que merece sua atenção.
            </p>
            <div className="admin-metrics">
              {[
                [
                  "Modelos na vitrine",
                  products.filter((p) => p.published).length,
                ],
                ["Atendimentos abertos", pendingOrders.length],
                [
                  "Unidades disponíveis",
                  products
                    .filter(canSell)
                    .reduce(
                      (n, p) => n + p.variants.reduce((s, v) => s + v.stock, 0),
                      0,
                    ),
                ],
                [
                  "Cadastros a conferir",
                  products.filter((p) => productIssues(p).length).length,
                ],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <div className="admin-overview-grid">
              <section className="admin-card">
                <div className="admin-section-heading">
                  <h2>Últimos atendimentos</h2>
                  <button type="button" onClick={() => void navigate("orders")}>
                    Ver todos
                  </button>
                </div>
                {!orders.length ? (
                  <Empty>As solicitações da loja vão aparecer aqui.</Empty>
                ) : (
                  orders.slice(0, 5).map((o) => (
                    <button
                      className="admin-list-row"
                      type="button"
                      key={o.id}
                      onClick={() => {
                        void navigate("orders");
                        openOrder(o);
                      }}
                    >
                      <span>
                        <strong>{o.customer.name}</strong>
                        <small>
                          {o.number} · {date(o.createdAt)}
                        </small>
                      </span>
                      <span className="admin-pill">
                        {serviceLabels[o.serviceStatus || "new"]}
                      </span>
                    </button>
                  ))
                )}
              </section>
              <section className="admin-card">
                <h2>Próximas ações</h2>
                <button
                  className="admin-action-card"
                  type="button"
                  onClick={() => {
                    void navigate("products");
                    setFilter("pending");
                  }}
                >
                  <strong>Conferir os cadastros</strong>
                  <span>
                    {products.filter((p) => productIssues(p).length).length}{" "}
                    modelos com fotos ou ficha a completar.
                  </span>
                </button>
                <button
                  className="admin-action-card"
                  type="button"
                  onClick={() => {
                    void navigate("inventory");
                    setFilter("zero");
                  }}
                >
                  <strong>Revisar o estoque</strong>
                  <span>
                    Consulte os saldos por variante e registre os ajustes.
                  </span>
                </button>
                <button
                  className="admin-action-card"
                  type="button"
                  onClick={() => void navigate("lenses")}
                >
                  <strong>Manter a tabela de lentes</strong>
                  <span>Atualize os valores usados no simulador.</span>
                </button>
              </section>
            </div>
          </>
        )}
        {tab === "products" &&
          (selected ? (
            <>
              <div className="admin-editor-tools">
                {selected.revision > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => create(selected)}
                  >
                    Duplicar como rascunho
                  </button>
                )}
                {selected.published && selected.revision > 0 && (
                  <Link
                    href={productHref(selected)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver na loja
                  </Link>
                )}
                <span>
                  {JSON.stringify(selected) !== baseline
                    ? "Alterações sem salvar"
                    : "Cadastro salvo"}
                </span>
              </div>
              <fieldset className="admin-editor-lock" disabled={busy}>
                <AdminProductEditor
                  key={selected.id}
                  selected={selected}
                  busy={busy}
                  brands={brands}
                  update={update}
                  variant={variant}
                  upload={upload}
                  save={save}
                  onClose={() => {
                    if (canLeave()) setSelected(null);
                  }}
                />
              </fieldset>
              <div className="admin-completeness">
                <strong>
                  {productIssues(selected).length
                    ? "Para conferir este modelo"
                    : "Ficha completa"}
                </strong>
                <ul>
                  {productIssues(selected).map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="admin-filter-bar">
                {search}
                <select
                  aria-label="Filtrar catálogo"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {[
                    ["all", "Todos os modelos"],
                    ["grau", "Óculos de grau"],
                    ["sol", "Óculos de sol"],
                    ["ready", "Validados"],
                    ["pending", "A conferir"],
                    ["draft", "Ocultos"],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar marca"
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas as marcas</option>
                  {brands.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => create()}
                >
                  Cadastrar modelo
                </button>
              </div>
              <div className="admin-table-actions">
                <span>
                  {checked.length
                    ? `${checked.length} selecionados`
                    : "Catálogo da loja"}
                </span>
                <div>
                  {checked.length > 0 && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void visibility(true)}
                      >
                        Exibir selecionados
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void visibility(false)}
                      >
                        Ocultar selecionados
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      download("catalogo-ocular.csv", [
                        [
                          "Modelo",
                          "Marca",
                          "Coleção",
                          "SKU",
                          "Variante",
                          "Preço (R$)",
                          "Estoque",
                          "Publicado",
                        ],
                        ...filteredProducts.flatMap((p) =>
                          p.variants.map((v) => [
                            p.name,
                            p.brand,
                            p.category,
                            v.sku,
                            v.label,
                            decimal(v.priceCents),
                            v.stock,
                            p.published ? "Sim" : "Não",
                          ]),
                        ),
                      ])
                    }
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Selecionar esta página"
                          checked={
                            view(filteredProducts).length > 0 &&
                            view(filteredProducts).every((p) =>
                              checked.includes(p.id),
                            )
                          }
                          onChange={(e) => {
                            const ids = view(filteredProducts).map((p) => p.id);
                            setChecked(
                              e.target.checked
                                ? Array.from(new Set([...checked, ...ids]))
                                : checked.filter((id) => !ids.includes(id)),
                            );
                          }}
                        />
                      </th>
                      <th>Modelo</th>
                      <th>Preço a partir de</th>
                      <th>Estoque</th>
                      <th>Situação</th>
                      <th>Vitrine</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view(filteredProducts).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${p.name}`}
                            checked={checked.includes(p.id)}
                            onChange={(e) =>
                              setChecked(
                                e.target.checked
                                  ? [...checked, p.id]
                                  : checked.filter((id) => id !== p.id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="admin-model"
                            type="button"
                            onClick={() => edit(p)}
                          >
                            <div className="admin-model-photo">
                              <ProductImage
                                src={p.images[0]}
                                alt=""
                                sizes="64px"
                              />
                            </div>
                            <span>
                              <strong>{p.name}</strong>
                              <small>
                                {p.brand} ·{" "}
                                {p.category === "grau" ? "Grau" : "Sol"} ·{" "}
                                {p.variants.length} variantes
                              </small>
                            </span>
                          </button>
                        </td>
                        <td className="admin-numeric">{money(minPrice(p))}</td>
                        <td className="admin-numeric">
                          {p.variants.reduce((n, v) => n + v.stock, 0)}
                        </td>
                        <td>
                          <span
                            className={`admin-pill ${!productIssues(p).length ? "is-green" : ""}`}
                          >
                            {productIssues(p).length
                              ? "A conferir"
                              : "Conferido"}
                          </span>
                        </td>
                        <td>{p.published ? "Visível" : "Oculto"}</td>
                        <td>
                          <button type="button" onClick={() => edit(p)}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredProducts.length && (
                  <Empty>Nenhum modelo encontrado.</Empty>
                )}
              </div>
              <Pager
                page={page}
                total={filteredProducts.length}
                onPage={setPage}
              />
            </>
          ))}
        {tab === "inventory" && (
          <>
            <p className="admin-page-description">
              Ajuste o preço e o saldo de cada variante. O histórico registra o
              motivo da alteração.
            </p>
            <div className="admin-filter-bar">
              {search}
              <select
                aria-label="Filtrar saldo"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todos os saldos</option>
                <option value="low">Estoque baixo · 1 a 3</option>
                <option value="zero">Sem estoque</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  download("estoque-ocular.csv", [
                    ["Modelo", "SKU", "Cor", "Preço (R$)", "Estoque"],
                    ...stockRows.map(({ p, v }) => [
                      p.name,
                      v.sku,
                      v.color,
                      decimal(v.priceCents),
                      v.stock,
                    ]),
                  ])
                }
              >
                Exportar CSV
              </button>
            </div>
            {inventory && (
              <form
                className="admin-card admin-inventory-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  void work(async () => {
                    await api(
                      "/api/admin/inventory",
                      json("PATCH", {
                        productId: inventory.product.id,
                        variantId: inventory.variant.id,
                        revision: inventory.product.revision,
                        stock: Number(inventory.stock),
                        priceCents: cents(inventory.price),
                        reason: inventory.reason,
                      }),
                    );
                    setInventory(null);
                    await refresh();
                    setMessage("Preço e estoque atualizados.");
                  });
                }}
              >
                <h2>{inventory.product.name}</h2>
                <p>{inventory.variant.label}</p>
                <div className="admin-fields">
                  <div className="store-field">
                    <label htmlFor="stock-price">Preço (R$)</label>
                    <input
                      id="stock-price"
                      inputMode="decimal"
                      pattern="[0-9]+([,.][0-9]{1,2})?"
                      required
                      value={inventory.price}
                      onChange={(e) =>
                        setInventory({ ...inventory, price: e.target.value })
                      }
                    />
                  </div>
                  <div className="store-field">
                    <label htmlFor="stock-count">Estoque disponível</label>
                    <input
                      id="stock-count"
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      required
                      value={inventory.stock}
                      onChange={(e) =>
                        setInventory({ ...inventory, stock: e.target.value })
                      }
                    />
                  </div>
                  <div className="store-field">
                    <label htmlFor="stock-reason">Motivo do ajuste</label>
                    <input
                      id="stock-reason"
                      required
                      minLength={3}
                      maxLength={300}
                      placeholder="Ex.: entrada de mercadoria"
                      value={inventory.reason}
                      onChange={(e) =>
                        setInventory({ ...inventory, reason: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button className="button" disabled={busy}>
                    {busy ? "Salvando…" : "Salvar ajuste"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setInventory(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Modelo / variante</th>
                    <th>SKU</th>
                    <th>Preço</th>
                    <th>Disponível</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {view(stockRows).map(({ p, v }) => (
                    <tr key={`${p.id}-${v.id}`}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>
                          {v.label} · {v.color || "Cor a preencher"}
                        </small>
                      </td>
                      <td>{v.sku || "—"}</td>
                      <td className="admin-numeric">{money(v.priceCents)}</td>
                      <td>
                        <span
                          className={`admin-pill ${v.stock > 3 ? "is-green" : ""}`}
                        >
                          {v.stock} un.
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (canLeave())
                              setInventory({
                                product: p,
                                variant: v,
                                price: decimal(v.priceCents),
                                stock: String(v.stock),
                                reason: "",
                              });
                          }}
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stockRows.length && <Empty>Nenhuma variante encontrada.</Empty>}
            </div>
            <Pager page={page} total={stockRows.length} onPage={setPage} />
          </>
        )}
        {tab === "orders" &&
          (selectedOrder ? (
            <form
              className="admin-card admin-service"
              onSubmit={(e) => {
                e.preventDefault();
                void work(async () => {
                  const d = await api<{ order: AdminOrder }>(
                    `/api/admin/orders/${selectedOrder.id}`,
                    json("PATCH", {
                      revision: selectedOrder.revision || 0,
                      serviceStatus: selectedOrder.serviceStatus || "new",
                      note: selectedOrder.note,
                    }),
                  );
                  setSelectedOrder(d.order);
                  setOrderBaseline(JSON.stringify(d.order));
                  await refresh();
                  setMessage("Atendimento atualizado.");
                });
              }}
            >
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">{selectedOrder.number}</p>
                  <h2>{selectedOrder.customer.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (canLeave()) setSelectedOrder(null);
                  }}
                >
                  Voltar à lista
                </button>
              </div>
              <p className="store-muted">
                Recebido em {date(selectedOrder.createdAt)}
              </p>
              <div className="admin-contact-actions">
                <a
                  href={`https://wa.me/55${selectedOrder.customer.phone}?text=${encodeURIComponent(`Olá, ${selectedOrder.customer.name}. Somos da Óptica Ocular e vamos conversar sobre sua solicitação ${selectedOrder.number}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conversar no WhatsApp
                </a>
                <a href={`tel:+55${selectedOrder.customer.phone}`}>
                  {selectedOrder.customer.phone}
                </a>
                <a href={`mailto:${selectedOrder.customer.email}`}>
                  {selectedOrder.customer.email}
                </a>
              </div>
              <h3>Itens solicitados</h3>
              {selectedOrder.items.map((i) => (
                <div
                  className="admin-service-item"
                  key={`${i.productId}-${i.variantId}`}
                >
                  <span>
                    <strong>
                      {i.quantity} × {i.name}
                    </strong>
                    <small>{i.variantLabel}</small>
                  </span>
                  <strong className="admin-numeric">
                    {money(i.priceCents * i.quantity)}
                  </strong>
                </div>
              ))}
              <p className="admin-service-total">
                Subtotal de referência{" "}
                <strong>{money(selectedOrder.subtotalCents)}</strong>
              </p>
              <p className="store-muted">
                Retirada a combinar na loja. Lentes de grau são orçadas à parte.
              </p>
              <div className="store-field">
                <label htmlFor="service-status">Etapa do atendimento</label>
                <select
                  id="service-status"
                  disabled={busy || selectedOrder.status !== "quote_requested"}
                  value={selectedOrder.serviceStatus || "new"}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      serviceStatus: e.target.value as Order["serviceStatus"],
                    })
                  }
                >
                  {Object.entries(serviceLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="store-field">
                <label htmlFor="service-note">Notas internas</label>
                <textarea
                  id="service-note"
                  maxLength={4000}
                  rows={5}
                  disabled={busy || selectedOrder.status !== "quote_requested"}
                  placeholder="Preferências, orçamento combinado e próximos passos. Visível somente para a equipe."
                  value={selectedOrder.note}
                  onChange={(e) =>
                    setSelectedOrder({ ...selectedOrder, note: e.target.value })
                  }
                />
              </div>
              <div className="admin-form-actions">
                <button
                  className="button"
                  disabled={busy || selectedOrder.status !== "quote_requested"}
                >
                  {busy ? "Salvando…" : "Salvar atendimento"}
                </button>
                <span>
                  {JSON.stringify(selectedOrder) !== orderBaseline
                    ? "Alterações sem salvar"
                    : "Atendimento salvo"}
                </span>
              </div>
            </form>
          ) : (
            <>
              <p className="admin-page-description">
                Acompanhe as solicitações e organize os próximos passos.
              </p>
              <div className="admin-filter-bar">
                {search}
                <select
                  aria-label="Filtrar etapa"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas as etapas</option>
                  {Object.entries(serviceLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    download("atendimentos-ocular.csv", [
                      [
                        "Número",
                        "Cliente",
                        "E-mail",
                        "Telefone",
                        "Recebido",
                        "Etapa",
                        "Subtotal (R$)",
                      ],
                      ...filteredOrders.map((o) => [
                        o.number,
                        o.customer.name,
                        o.customer.email,
                        o.customer.phone,
                        date(o.createdAt),
                        serviceLabels[o.serviceStatus || "new"],
                        decimal(o.subtotalCents),
                      ]),
                    ])
                  }
                >
                  Exportar CSV
                </button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Solicitação</th>
                      <th>Cliente</th>
                      <th>Recebida em</th>
                      <th>Referência</th>
                      <th>Etapa</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view(filteredOrders).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.number}</strong>
                          <small>
                            {o.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                            item(ns)
                          </small>
                        </td>
                        <td>
                          <strong>{o.customer.name}</strong>
                          <small>{o.customer.phone}</small>
                        </td>
                        <td>{date(o.createdAt)}</td>
                        <td className="admin-numeric">
                          {money(o.subtotalCents)}
                        </td>
                        <td>
                          <span
                            className={`admin-pill ${o.serviceStatus === "completed" ? "is-green" : ""}`}
                          >
                            {serviceLabels[o.serviceStatus || "new"]}
                          </span>
                        </td>
                        <td>
                          <button type="button" onClick={() => openOrder(o)}>
                            Abrir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredOrders.length && (
                  <Empty>Nenhum atendimento encontrado.</Empty>
                )}
              </div>
              <Pager
                page={page}
                total={filteredOrders.length}
                onPage={setPage}
              />
            </>
          ))}
        {tab === "customers" && (
          <>
            <p className="admin-page-description">
              Contatos que solicitaram atendimento e seu histórico na loja.
            </p>
            <div className="admin-filter-bar">
              {search}
              <button
                type="button"
                onClick={() =>
                  download("clientes-ocular.csv", [
                    [
                      "Nome",
                      "E-mail",
                      "Telefone",
                      "Solicitações",
                      "Último atendimento",
                    ],
                    ...customers.map((c) => [
                      c.name,
                      c.email,
                      c.phone,
                      c.orders.length,
                      date(c.orders[0].createdAt),
                    ]),
                  ])
                }
              >
                Exportar CSV
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Solicitações</th>
                    <th>Último atendimento</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {view(customers).map((c) => (
                    <tr key={c.phone || c.email}>
                      <td>
                        <strong>{c.name}</strong>
                        <small>{c.email}</small>
                      </td>
                      <td>
                        <a href={`tel:+55${c.phone}`}>{c.phone}</a>
                      </td>
                      <td>{c.orders.length}</td>
                      <td>{date(c.orders[0].createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            void navigate("orders");
                            setQuery(c.phone);
                          }}
                        >
                          Ver histórico
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!customers.length && (
                <Empty>
                  Os contatos aparecem conforme as solicitações chegarem.
                </Empty>
              )}
            </div>
            <Pager page={page} total={customers.length} onPage={setPage} />
          </>
        )}
        {tab === "lenses" && (
          <>
            <p className="admin-page-description">
              Os valores salvos aqui são usados pelo simulador da loja.
            </p>
            <div className="admin-filter-bar">
              {search}
              <select
                aria-label="Filtrar marca da lente"
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas as marcas</option>
                {Array.from(new Set(lensData?.rows.map((r) => r.brand)))
                  .sort()
                  .map((b) => (
                    <option key={b}>{b}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  download("lentes-ocular.csv", [
                    [
                      "Marca",
                      "Categoria",
                      "Linha",
                      "Tecnologia",
                      "Material",
                      "Índice",
                      "Tratamento",
                      "Valor (R$)",
                    ],
                    ...lensRows.map((r) => [
                      r.brand,
                      r.category,
                      r.line,
                      r.option,
                      r.material,
                      r.index,
                      r.treatment,
                      decimal(r.priceCents),
                    ]),
                  ])
                }
              >
                Exportar CSV
              </button>
            </div>
            <form
              className="admin-lens-adjust"
              onSubmit={(e) => {
                e.preventDefault();
                const percent = Number(
                  new FormData(e.currentTarget).get("percent"),
                );
                if (lensRows.length > 1000) {
                  setError(
                    "Filtre a marca ou a linha para reajustar até 1.000 configurações por vez.",
                  );
                  return;
                }
                if (
                  lensRows.some(
                    (r) =>
                      lensEdits[r.id] !== undefined &&
                      !Number.isFinite(cents(lensEdits[r.id])),
                  )
                ) {
                  setError(
                    "Corrija os valores em edição antes de aplicar o reajuste.",
                  );
                  return;
                }
                if (
                  !window.confirm(
                    `Preparar reajuste de ${percent}% em ${lensRows.length} configurações filtradas?`,
                  )
                )
                  return;
                const next = { ...lensEdits };
                for (const r of lensRows)
                  next[r.id] = decimal(
                    Math.max(
                      1,
                      Math.round(
                        (lensEdits[r.id]
                          ? cents(lensEdits[r.id])
                          : r.priceCents) *
                          (1 + percent / 100),
                      ),
                    ),
                  );
                setLensEdits(next);
              }}
            >
              <label htmlFor="lens-percent">
                Reajustar resultados filtrados
              </label>
              <input
                id="lens-percent"
                name="percent"
                type="number"
                min="-99"
                max="200"
                step="0.1"
                required
                placeholder="%"
                disabled={busy}
              />
              <button disabled={busy || !lensRows.length}>
                Aplicar percentual
              </button>
            </form>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Configuração</th>
                    <th>Tratamento</th>
                    <th>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {view(lensRows).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.line}</strong>
                        <small>
                          {r.brand} · {r.category}
                        </small>
                      </td>
                      <td>
                        {r.option}
                        <small>
                          {r.material} {r.index}
                        </small>
                      </td>
                      <td>{r.treatment}</td>
                      <td>
                        <input
                          className="admin-lens-price"
                          aria-label={`Preço de ${r.line}, ${r.option}, ${r.treatment}, ${r.material} ${r.index}`}
                          inputMode="decimal"
                          disabled={busy}
                          value={lensEdits[r.id] ?? decimal(r.priceCents)}
                          onChange={(e) => {
                            const next = { ...lensEdits };
                            if (cents(e.target.value) === r.priceCents)
                              delete next[r.id];
                            else next[r.id] = e.target.value;
                            setLensEdits(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!lensRows.length && (
                <Empty>
                  {busy
                    ? "Carregando a tabela…"
                    : "Nenhuma configuração encontrada."}
                </Empty>
              )}
            </div>
            <Pager page={page} total={lensRows.length} onPage={setPage} />
            <div className="admin-lens-save">
              <span>{Object.keys(lensEdits).length} valores alterados</span>
              <button
                type="button"
                className="button"
                disabled={busy || !Object.keys(lensEdits).length}
                onClick={() =>
                  void work(async () => {
                    const changes = Object.entries(lensEdits).map(
                      ([id, value]) => ({ id, priceCents: cents(value) }),
                    );
                    if (
                      changes.some(
                        (c) =>
                          !Number.isFinite(c.priceCents) || c.priceCents <= 0,
                      )
                    )
                      throw new Error(
                        "Confira os preços alterados. Use valores como 349,90.",
                      );
                    await api(
                      "/api/admin/lenses",
                      json("PATCH", {
                        revision: lensData?.revision || 0,
                        changes,
                      }),
                    );
                    setLensData(await api("/api/admin/lenses"));
                    setLensEdits({});
                    await refresh();
                    setMessage("Tabela de lentes atualizada no simulador.");
                  })
                }
              >
                {busy ? "Salvando…" : "Salvar preços"}
              </button>
            </div>
          </>
        )}
        {tab === "activity" && (
          <>
            <p className="admin-page-description">
              As 50 alterações e acessos mais recentes da operação.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Atividade</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.activity.map((e) => (
                    <tr key={e.id}>
                      <td>{date(e.created)}</td>
                      <td>
                        <strong>
                          {activityLabels[e.type] || "Atualização da loja"}
                        </strong>
                      </td>
                      <td>
                        {e.body.name ||
                          e.body.number ||
                          (e.body.configurations
                            ? `${e.body.configurations} configurações`
                            : e.body.models
                              ? `${e.body.models} modelos`
                              : "Equipe Ocular")}
                        {e.body.reason && <small>{e.body.reason}</small>}
                        {e.body.previousStock !== undefined && (
                          <small>
                            Saldo anterior: {e.body.previousStock} · atual:{" "}
                            {e.body.stock}
                          </small>
                        )}
                        {e.body.status && (
                          <small>
                            {serviceLabels[
                              e.body.status as keyof typeof serviceLabels
                            ] || e.body.status}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.activity.length && (
                <Empty>As atividades da equipe serão registradas aqui.</Empty>
              )}
            </div>
          </>
        )}
        {tab === "settings" && (
          <>
            <p className="admin-page-description">
              A configuração da operação e os serviços conectados à loja.
            </p>
            <div className="admin-overview-grid">
              <section className="admin-card">
                <h2>Serviços</h2>
                <dl className="admin-details">
                  <div>
                    <dt>Banco de dados</dt>
                    <dd>
                      <span className="admin-status-dot" />
                      {data?.config.database}
                    </dd>
                  </div>
                  <div>
                    <dt>Fotografias</dt>
                    <dd>{data?.config.media}</dd>
                  </div>
                  <div>
                    <dt>Domínio</dt>
                    <dd>
                      <a
                        href={data?.config.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {data?.config.siteUrl}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Sessão da equipe</dt>
                    <dd>Até 8 horas</dd>
                  </div>
                  <div>
                    <dt>Histórico</dt>
                    <dd>Alterações registradas no banco</dd>
                  </div>
                </dl>
              </section>
              <section className="admin-card">
                <h2>Operação comercial</h2>
                <dl className="admin-details">
                  <div>
                    <dt>Óculos</dt>
                    <dd>Armações e óculos de sol</dd>
                  </div>
                  <div>
                    <dt>Lentes de grau</dt>
                    <dd>Simulação e atendimento separado</dd>
                  </div>
                  <div>
                    <dt>Entrega</dt>
                    <dd>Retirada na loja</dd>
                  </div>
                  <div>
                    <dt>Pagamento online</dt>
                    <dd>A definir após validação com o cliente</dd>
                  </div>
                  <div>
                    <dt>Indexação</dt>
                    <dd>
                      {data?.config.indexingEnabled
                        ? "Ativa"
                        : "Desativada durante a apresentação"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
            <section className="admin-card admin-operation-note">
              <h2>Rotina da equipe</h2>
              <p>
                Cadastre o modelo, envie as três fotos e preencha as variantes.
                Confirme os preços e confira a ficha antes de validar. Use
                Atendimentos para registrar o contato, o orçamento e a
                conclusão. As notas ficam restritas à equipe.
              </p>
              <p>
                Os arquivos CSV permitem consultar o catálogo, o estoque, as
                lentes e os contatos fora do painel. O backup completo do banco
                é administrado no Supabase.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
