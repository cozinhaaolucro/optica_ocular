"use client";
import { useState } from "react";
import type { Product, Variant } from "@/lib/types";
import ProductImage from "./ProductImage";
export default function AdminProductEditor({
  selected,
  busy,
  brands,
  update,
  variant,
  upload,
  save,
  onClose,
}: {
  selected: Product;
  busy: boolean;
  brands: string[];
  update: (patch: Partial<Product>) => void;
  variant: (index: number, patch: Partial<Variant>) => void;
  upload: (file: File | undefined, index: number) => Promise<void>;
  save: () => Promise<void>;
  onClose: () => void;
}) {
  const [tagText, setTagText] = useState(selected.tags.join(", "));
  return (
    <form
      className="admin-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="admin-editor-top">
        <h2>{selected.name}</h2>
        <button type="button" className="store-clear-link" onClick={onClose}>
          Voltar ao catálogo
        </button>
      </div>
      <div className="admin-fields">
        <div className="store-field">
          <label htmlFor="p-name">Nome</label>
          <input
            id="p-name"
            required
            minLength={3}
            maxLength={150}
            value={selected.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="store-field">
          <label htmlFor="p-brand">Marca</label>
          <input
            id="p-brand"
            required
            maxLength={80}
            list="admin-brand-list"
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
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          value={selected.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <div className="admin-fields">
        <div className="store-field">
          <label htmlFor="p-slug">Endereço do modelo</label>
          <input
            id="p-slug"
            value={selected.slug}
            pattern="[a-z0-9-]{3,100}"
            required
            readOnly={selected.revision > 0}
            onChange={(e) => update({ slug: e.target.value })}
          />
          <small>
            /produtos/{selected.category}/{selected.slug}
          </small>
        </div>
        <div className="store-field">
          <label htmlFor="p-tags">Tags, separadas por vírgula</label>
          <input
            id="p-tags"
            value={tagText}
            onChange={(e) => {
              setTagText(e.target.value);
              update({
                tags: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              });
            }}
          />
        </div>
      </div>
      <div className="store-field">
        <label htmlFor="p-features">Características, uma por linha</label>
        <textarea
          id="p-features"
          rows={3}
          value={selected.features.join("\n")}
          onChange={(e) => update({ features: e.target.value.split("\n") })}
        />
      </div>
      <datalist id="admin-brand-list">
        {brands.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <h3>Fotografias do modelo · 4:3</h3>
      <p className="store-muted">
        JPG, PNG ou WebP. Recomendado: 1600 × 1200 px. Fundo neutro, produto
        inteiro e margens consistentes.
      </p>
      <div className="admin-photo-slots">
        {(["frontal", "lateral", "detalhe"] as const).map((view, i) => (
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
            <div className="admin-photo-actions">
              <button
                type="button"
                disabled={busy || !selected.images[i]}
                onClick={() => {
                  const images = [...selected.images];
                  images[i] = `/assets/placeholders/${view}.svg`;
                  update({ images });
                }}
              >
                Remover
              </button>
              {i > 0 && (
                <button
                  type="button"
                  disabled={busy || !selected.images[i]}
                  onClick={() => {
                    const images = Array.from(
                      { length: Math.max(3, selected.images.length) },
                      (_, n) =>
                        selected.images[n] ||
                        `/assets/placeholders/${["frontal", "lateral", "detalhe"][n % 3]}.svg`,
                    );
                    [images[0], images[i]] = [images[i], images[0]];
                    update({ images });
                  }}
                >
                  Usar como capa
                </button>
              )}
            </div>
          </div>
        ))}
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
                  onChange={(e) => variant(i, { [key]: e.target.value })}
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
                    priceCents: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-stock`}>Estoque disponível</label>
              <input
                id={`${v.id}-stock`}
                type="number"
                min="0"
                step="1"
                value={v.stock}
                onChange={(e) => variant(i, { stock: Number(e.target.value) })}
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
                  value={v[key as "lensWidth" | "bridge" | "temple"] ?? ""}
                  onChange={(e) =>
                    variant(i, {
                      [key]: e.target.value ? Number(e.target.value) : null,
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
                  variants: selected.variants.filter((_, index) => index !== i),
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
          ["verified", "Fotos, ficha e variantes conferidas pela loja"],
        ].map(([key, label]) => (
          <label className="store-checkbox" key={key}>
            <input
              type="checkbox"
              checked={
                selected[key as "published" | "priceConfirmed" | "verified"]
              }
              onChange={(e) => update({ [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
        <p className="store-muted">
          A validação exige três fotos diferentes, material, SKU, cor, medidas e
          preço confirmado. O pagamento permanece desativado nesta etapa.
        </p>
      </div>
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Salvando…" : "Salvar cadastro"}
      </button>
    </form>
  );
}
