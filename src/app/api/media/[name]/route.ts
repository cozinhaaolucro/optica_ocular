import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { usesPostgres } from "@/lib/storage-mode";
import { supabaseUrl, mediaBucket } from "@/lib/media";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name))
    return new Response(null, { status: 404 });
  try {
    if (usesPostgres()) {
      const response = await fetch(
        `${supabaseUrl()}/storage/v1/object/public/${mediaBucket}/${name}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok)
        return new Response(null, {
          status: response.status === 404 ? 404 : 503,
        });
      return new Response(response.body, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const file = await readFile(
      resolve(
        dirname(process.env.OCULAR_DB_PATH || "data/ocular.sqlite"),
        "media",
        name,
      ),
    );
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: usesPostgres() ? 503 : 404 });
  }
}
