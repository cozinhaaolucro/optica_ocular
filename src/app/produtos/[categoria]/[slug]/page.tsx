import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/catalog";
import {
  canSell,
  lowestAvailablePricedVariant,
  productHref,
  sellingPrice,
} from "@/lib/product";
import { siteUrl } from "@/lib/config";
import ProductDetails from "@/components/ProductDetails";
import ProductCard from "@/components/ProductCard";
export const dynamic = "force-dynamic";
const getPageProducts = cache(getProducts);
const find = async (category: string, slug: string) =>
  (await getPageProducts()).find(
    (p) => p.category === category && p.slug === slug,
  );
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; slug: string }>;
}): Promise<Metadata> {
  const { categoria, slug } = await params;
  const p = await find(categoria, slug);
  if (!p) return { title: "Modelo não encontrado", robots: { index: false } };
  const description =
    p.description ||
    `Conheça ${p.name} e solicite um orçamento na Óptica Ocular, em Curitiba.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: productHref(p) },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Óptica Ocular",
      url: productHref(p),
      title: p.name,
      description,
      images: p.images
        .filter((image) => !image.includes("/placeholders/"))
        .map((url) => ({ url, alt: p.name })),
    },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ categoria: string; slug: string }>;
}) {
  const { categoria, slug } = await params;
  const p = await find(categoria, slug);
  if (!p) notFound();
  const related = (await getPageProducts())
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 3);
  const offeredVariant = lowestAvailablePricedVariant(p);
  const images = p.images.filter((image) => !image.includes("/placeholders/"));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    brand: { "@type": "Brand", name: p.brand },
    ...(images.length ? { image: images.map((i) => siteUrl() + i) } : {}),
    ...(canSell(p)
      ? {
          offers: {
            "@type": "Offer",
            price: (sellingPrice(offeredVariant) / 100).toFixed(2),
            priceCurrency: "BRL",
            availability:
              offeredVariant.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: siteUrl() + productHref(p),
          },
        }
      : {}),
  };
  return (
    <main id="conteudo" className="store-page">
      <nav className="store-breadcrumb" aria-label="Caminho da página">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href={`/produtos/${p.category}`}>
          {p.category === "grau" ? "Óculos de grau" : "Óculos de sol"}
        </Link>
        <span>/</span>
        <span aria-current="page">{p.name}</span>
      </nav>
      <ProductDetails key={p.id} product={p} />
      <section className="store-related">
        <div className="store-section-top">
          <h2>
            Outros <em>olhares.</em>
          </h2>
          <Link href={`/produtos/${p.category}`} className="text-link">
            Ver a coleção
          </Link>
        </div>
        <div className="store-products-grid related-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
