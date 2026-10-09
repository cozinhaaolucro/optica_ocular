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
  const photos = selected.images.filter(
    (image) => image && !image.includes("/placeholders/"),
  );
  const estimated = selected.tags.includes("referencia-estimada");
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
      {estimated && (
        <p className="admin-reference-note">
          Referência estimada a partir do vídeo. Confira o código na haste e a
          cor da peça antes de validar esta ficha.
        </p>
      )}
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
            maxLength={120}
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
          <label htmlFor="p-description-source">Origem da descrição</label>
          <select
            id="p-description-source"
            value={
              selected.descriptionSource ??
              (selected.tags.includes("videos-20261008")
                ? "generated"
                : "original")
            }
            onChange={(e) =>
              update({
                descriptionSource: e.target
                  .value as Product["descriptionSource"],
              })
            }
          >
            <option value="original">Texto próprio ou do fabricante</option>
            <option value="generated">Texto assistido por IA</option>
          </select>
          <small>
            Usada na exportação para o Google; não aparece na vitrine.
          </small>
        </div>
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
        JPG, PNG ou WebP. Recomendado: 1600 × 1200 px. Fundo branco, produto
        inteiro e centralizado. Prefira a vista frontal como foto principal.{" "}
        {photos.length}{" "}
        {photos.length === 1 ? "foto cadastrada" : "fotos cadastradas"}.
      </p>
      <div className="admin-photo-slots">
        {(["frontal", "lateral", "detalhe"] as const).map((view, i) => (
          <div key={view}>
            <div className="admin-photo">
              <ProductImage
                src={photos[i]}
                alt={`${selected.name}, foto ${i + 1}`}
                view={view}
              />
            </div>
            <label htmlFor={`photo-${i}`}>
              {i === 0 ? "Principal" : `Outra vista ${i}`}
            </label>
            <input
              id={`photo-${i}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0], i);
                e.target.value = "";
              }}
            />
            <div className="admin-photo-actions">
              <button
                type="button"
                disabled={busy || !photos[i]}
                onClick={() => {
                  const images = [...photos];
                  images.splice(i, 1);
                  update({
                    images,
                    variants: selected.variants.map((v) =>
                      v.image === photos[i] ? { ...v, image: "" } : v,
                    ),
                  });
                }}
              >
                Remover
              </button>
              {i > 0 && (
                <button
                  type="button"
                  disabled={busy || !photos[i]}
                  onClick={() => {
                    const images = [...photos];
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
                  required={key === "label"}
                  maxLength={key === "label" ? 120 : 80}
                  value={v[key as "label" | "sku" | "color"]}
                  onChange={(e) => variant(i, { [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="store-field">
              <label htmlFor={`${v.id}-gtin`}>
                Código de barras (GTIN / EAN)
              </label>
              <input
                id={`${v.id}-gtin`}
                inputMode="numeric"
                maxLength={14}
                value={v.gtin || ""}
                onChange={(e) =>
                  variant(i, { gtin: e.target.value.replace(/\s/g, "") })
                }
                aria-describedby={`${v.id}-gtin-help`}
              />
              <small id={`${v.id}-gtin-help`}>
                Use o código da etiqueta, inclusive os zeros iniciais.
              </small>
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-image`}>Foto desta variante</label>
              <select
                id={`${v.id}-image`}
                value={v.image || ""}
                onChange={(e) => variant(i, { image: e.target.value })}
                aria-describedby={`${v.id}-image-help`}
              >
                <option value="">Usar a foto principal</option>
                {photos.map((path, index) => (
                  <option key={path} value={path}>
                    Foto {index + 1}
                    {index === 0 ? " · principal" : ""}
                  </option>
                ))}
              </select>
              <small id={`${v.id}-image-help`}>
                Com cores diferentes, associe a foto de cada opção.
              </small>
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-mpn`}>
                Referência do fabricante (MPN)
              </label>
              <input
                id={`${v.id}-mpn`}
                maxLength={70}
                value={v.mpn || ""}
                onChange={(e) => variant(i, { mpn: e.target.value })}
                aria-describedby={`${v.id}-mpn-help`}
              />
              <small id={`${v.id}-mpn-help`}>
                Código completo do modelo e da cor. Informe o GTIN sempre que
                houver.
              </small>
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-price`}>Preço normal (R$)</label>
              <input
                id={`${v.id}-price`}
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                required={selected.priceConfirmed || selected.verified}
                value={v.priceCents > 0 ? v.priceCents / 100 : ""}
                placeholder="A preencher"
                onChange={(e) =>
                  variant(i, {
                    priceCents: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-promotion`}>
                Preço promocional (R$)
              </label>
              <input
                id={`${v.id}-promotion`}
                type="number"
                min="0.01"
                max={v.priceCents > 0 ? (v.priceCents - 1) / 100 : undefined}
                disabled={v.priceCents <= 0}
                step="0.01"
                value={
                  v.promotionPriceCents == null
                    ? ""
                    : v.promotionPriceCents / 100
                }
                placeholder="Sem promoção"
                aria-describedby={`${v.id}-promotion-help`}
                onChange={(e) =>
                  variant(i, {
                    promotionPriceCents:
                      e.target.value === ""
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
              />
              <small id={`${v.id}-promotion-help`} className="store-muted">
                Menor que o normal. Deixe vazio para encerrar.
              </small>
            </div>
            <div className="store-field">
              <label htmlFor={`${v.id}-stock`}>Estoque disponível</label>
              <input
                id={`${v.id}-stock`}
                type="number"
                min="0"
                max="100000"
                step="1"
                required
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
        disabled={busy || selected.variants.length >= 40}
        onClick={() =>
          update({
            variants: [
              ...selected.variants,
              {
                ...selected.variants[0],
                id: `${selected.id}-${Date.now()}`,
                sku: "",
                gtin: "",
                mpn: "",
                image: "",
                label: "Nova variante",
                promotionPriceCents: null,
                stock: 0,
              },
            ],
          })
        }
      >
        + Adicionar variante
      </button>
      {selected.variants.length >= 40 && (
        <p className="store-muted">Limite de 40 variantes por modelo.</p>
      )}
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
