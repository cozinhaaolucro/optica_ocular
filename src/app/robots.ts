import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const live = process.env.OCULAR_INDEXING_ENABLED === "true";
  return {
    rules: {
      userAgent: "*",
      ...(live
        ? {
            allow: "/",
            disallow: ["/admin", "/api/", "/carrinho", "/checkout", "/pedido/"],
          }
        : { disallow: "/" }),
    },
    ...(live ? { sitemap: `${siteUrl()}/sitemap.xml` } : {}),
  };
}
