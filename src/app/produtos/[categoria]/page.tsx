import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/catalog";
import { categories } from "@/lib/product";
import CategoryPageWrapper from "@/components/CategoryPageWrapper";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>;
}): Promise<Metadata> {
  const { categoria } = await params;
  const c = categories.find((c) => c.id === categoria);
  return {
    title: c?.name || "Coleção",
    description: c?.description,
    alternates: { canonical: `/produtos/${categoria}` },
  };
}
export default async function Category({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const c = categories.find((c) => c.id === categoria);
  if (!c) notFound();
  const products = (await getProducts()).filter((p) => p.category === c.id);
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <Link href="/oculos" className="store-breadcrumb">
          Coleções /
        </Link>
        <h1>{c.name}</h1>
        <p>{c.description}</p>
      </div>
      <Suspense fallback={<p role="status">Preparando os filtros…</p>}>
        <CategoryPageWrapper products={products} />
      </Suspense>
    </main>
  );
}
