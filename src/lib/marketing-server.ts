import "server-only";
import { getProducts } from "./catalog";
import { siteUrl, storeConfig } from "./config";
import { productFeed, type FeedChannel } from "./marketing-feeds";
export async function serveProductFeed(channel: FeedChannel) {
  try {
    const products = await getProducts();
    const config = await storeConfig();
    const feed = productFeed(products, channel, {
      siteUrl: siteUrl(),
      paymentsEnabled: config.paymentsEnabled,
      indexingEnabled: process.env.OCULAR_INDEXING_ENABLED === "true",
    });
    return new Response(feed.content, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "X-Catalog-Items": String(feed.count),
      },
    });
  } catch {
    return new Response(
      "Não foi possível atualizar o catálogo. Tente novamente.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": "60",
        },
      },
    );
  }
}
