"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import {
  availability,
  sellingPrice,
  isOnPromotion,
  canSell,
  whatsapp,
} from "@/lib/product";
import { formatCurrency } from "@/lib/currency";
import { track } from "@/lib/analytics";
import ProductImage from "./ProductImage";
import AddToCartButton from "./AddToCartButton";
export default function ProductDetails({ product }: { product: Product }) {
  const [photo, setPhoto] = useState(0);
  const [variantId, setVariantId] = useState(
    (product.variants.find((v) => v.stock > 0) || product.variants[0]).id,
  );
  const variant =
    product.variants.find((v) => v.id === variantId) || product.variants[0];
  const price = sellingPrice(variant);
  const views = ["frontal", "lateral", "detalhe"] as const;
  const count = Math.max(1, product.images.length);
  const selectedPhoto = Math.min(photo, count - 1);
  const hasMeasures = !!(variant.lensWidth && variant.bridge && variant.temple);
  const hasSpecs = !!(
    variant.color ||
    product.material ||
    product.features.length ||
    hasMeasures ||
    variant.sku
  );
  useEffect(() => {
    track("view_product", product.category);
  }, [product.category]);
  return (
    <div className="store-product-detail">
      <div className="store-gallery">
        <div className="store-gallery-main">
          <ProductImage
            key={selectedPhoto}
            src={product.images[selectedPhoto]}
            alt={`${product.name}, foto ${selectedPhoto + 1}`}
            view={views[selectedPhoto % 3]}
            priority={selectedPhoto === 0}
            sizes="(max-width: 560px) 90vw, (max-width: 820px) 45vw, 50vw"
          />
        </div>
        <div
          className="store-thumbnails"
          role="group"
          aria-label="Fotos do produto"
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver foto ${i + 1} de ${product.name}`}
              aria-pressed={selectedPhoto === i}
              onClick={() => setPhoto(i)}
            >
              <ProductImage
                src={product.images[i]}
                alt=""
                view={views[i % 3]}
                sizes="(max-width: 560px) 28vw, 15vw"
              />
            </button>
          ))}
        </div>
      </div>
      <div className="store-product-copy">
        <p className="eyebrow">
          {product.brand} ·{" "}
          {product.category === "grau" ? "Armação de grau" : "Óculos de sol"}
        </p>
        <h1>{product.name}</h1>
        <div>
          {isOnPromotion(variant) && (
            <span className="store-price-was">
              <span className="sr-only">De </span>
              <del>{formatCurrency(variant.priceCents / 100)}</del>
            </span>
          )}
          <p className="store-price detail-price">
            {isOnPromotion(variant) && <span className="sr-only">Por </span>}
            {price > 0 ? formatCurrency(price / 100) : "Consulte o valor"}
          </p>
          <p className="store-price-note">
            {price > 0 && product.priceConfirmed
              ? product.category === "grau"
                ? "Preço da armação. Lentes de grau à parte."
                : "Preço do óculos de sol."
              : price <= 0
                ? product.category === "grau"
                  ? "Lentes de grau à parte."
                  : ""
                : product.category === "grau"
                  ? "Valor estimado · lentes à parte"
                  : "Valor estimado"}
          </p>
        </div>
        <p
          className={`store-availability ${product.verified ? "is-verified" : ""}`}
        >
          {canSell(product)
            ? variant.stock > 0
              ? "Disponível"
              : "Esgotado nesta opção"
            : availability(product)}
        </p>
        {product.description && <p>{product.description}</p>}
        {product.variants.length > 1 && (
          <div className="store-field">
            <label htmlFor="product-variant">Cor e tamanho</label>
            <select
              id="product-variant"
              value={variant.id}
              onChange={(e) => setVariantId(e.target.value)}
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {canSell(product) && !v.stock ? " · Esgotado" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {hasSpecs && (
          <dl className="store-specs">
            {variant.color && (
              <div>
                <dt>Cor</dt>
                <dd>{variant.color}</dd>
              </div>
            )}
            {product.material && (
              <div>
                <dt>Material</dt>
                <dd>{product.material}</dd>
              </div>
            )}
            {product.features.length > 0 && (
              <div>
                <dt>Detalhes</dt>
                <dd>{product.features.join(" · ")}</dd>
              </div>
            )}
            {hasMeasures && (
              <div>
                <dt>Medidas</dt>
                <dd>
                  {variant.lensWidth} · {variant.bridge} · {variant.temple} mm
                </dd>
              </div>
            )}
            {variant.sku && (
              <div>
                <dt>Referência</dt>
                <dd>{variant.sku}</dd>
              </div>
            )}
          </dl>
        )}
        {hasMeasures && (
          <p className="store-measure-guide">
            Largura da lente · ponte · comprimento da haste.
          </p>
        )}
        <AddToCartButton
          key={variant.id}
          product={product}
          variantId={variant.id}
        />
        <a
          className="store-secondary-link"
          href={whatsapp(
            `Olá! Tenho interesse no modelo ${product.name}, opção ${variant.label}. Podem me ajudar com esse modelo?`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          Falar com a loja
        </a>
        <details className="store-detail-info">
          <summary>Retirada e atendimento</summary>
          <p>
            Retire na Rua Bispo Dom José, 2655, em Curitiba. Combine o prazo e o
            pagamento com a loja ao concluir seu orçamento.
          </p>
        </details>
        {product.category === "grau" && (
          <details className="store-detail-info">
            <summary>Como escolher minhas lentes?</summary>
            <p>
              A armação e as lentes são escolhas separadas. Traga sua receita
              para a equipe avaliar a compatibilidade e preparar um orçamento
              para sua rotina.
            </p>
            <Link href="/lentes">Conhecer o simulador de lentes</Link>
          </details>
        )}
      </div>
    </div>
  );
}
