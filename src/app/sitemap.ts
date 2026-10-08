import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { getProducts } from "@/lib/catalog";
import { canSell, productHref } from "@/lib/product";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.OCULAR_INDEXING_ENABLED !== "true") return [];
  const root = siteUrl();
  return [
    ...[
      "",
      "/oculos",
      "/produtos/grau",
      "/produtos/sol",
      "/lentes",
      "/sobre",
      "/visite",
      "/duvidas",
      "/entrega",
      "/trocas",
      "/privacidade",
    ].map((path) => ({ url: root + path })),
    ...(await getProducts()).filter(canSell).map((p) => ({
      url: root + productHref(p),
      images: p.images.map((i) => root + i),
    })),
  ];
}
