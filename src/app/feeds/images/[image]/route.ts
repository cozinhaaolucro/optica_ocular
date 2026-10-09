import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { getProduct } from "@/lib/catalog";
import { catalogImageMatches, isRealCatalogImage } from "@/lib/marketing-feeds";
import { usesPostgres } from "@/lib/storage-mode";
import { supabaseUrl, mediaBucket } from "@/lib/media";
import { siteUrl } from "@/lib/config";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ image: string }> },
) {
  const { image } = await params;
  const match = /^([a-z0-9-]{3,100})-(\d{1,2})-([a-f0-9]{12})\.jpg$/.exec(
    image,
  );
  if (!match) return new Response(null, { status: 404 });
  try {
    const product = await getProduct(match[1]);
    const index = Number(match[2]);
    if (!product?.published || !catalogImageMatches(product, index, match[3]))
      return new Response(null, { status: 404 });
    const source = product.images[index];
    if (!isRealCatalogImage(source)) return new Response(null, { status: 404 });
    let bytes: Buffer;
    if (source.startsWith("/api/media/")) {
      const name = source.slice("/api/media/".length);
      if (!/^[a-f0-9-]{36}\.webp$/.test(name))
        return new Response(null, { status: 404 });
      if (usesPostgres()) {
        const response = await fetch(
          `${supabaseUrl()}/storage/v1/object/public/${mediaBucket}/${name}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (!response.ok)
          return new Response(null, {
            status: response.status === 404 ? 404 : 503,
          });
        bytes = Buffer.from(await response.arrayBuffer());
      } else
        bytes = await readFile(
          resolve(
            dirname(process.env.OCULAR_DB_PATH || "data/ocular.sqlite"),
            "media",
            name,
          ),
        );
    } else {
      const response = await fetch(new URL(source, siteUrl()), {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        return new Response(null, {
          status: response.status === 404 ? 404 : 503,
        });
      bytes = Buffer.from(await response.arrayBuffer());
    }
    if (bytes.length > 4 * 1024 * 1024)
      return new Response(null, { status: 413 });
    const output = await sharp(bytes, { limitInputPixels: 16777216 })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(1200, 1200, { fit: "contain", background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
