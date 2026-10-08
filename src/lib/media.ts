import "server-only";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { usesPostgres, PersistenceUnavailableError } from "./storage-mode";

export const mediaBucket = "ocular-products";
export function supabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
}
export function storageConfigured() {
  return !!supabaseUrl() && !!process.env.SUPABASE_SECRET_KEY;
}
function storage() {
  const url = supabaseUrl();
  if (!storageConfigured() || !url.startsWith("https://"))
    throw new PersistenceUnavailableError();
  return createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).storage;
}

export async function ensureMediaBucket() {
  const client = storage();
  const existing = await client.getBucket(mediaBucket);
  if (existing.data) {
    if (!existing.data.public)
      throw new Error(
        "O bucket de fotografias precisa permitir leitura pública.",
      );
    return;
  }
  const created = await client.createBucket(mediaBucket, {
    public: true,
    fileSizeLimit: 4 * 1024 * 1024,
    allowedMimeTypes: ["image/webp"],
  });
  if (created.error && !(await client.getBucket(mediaBucket)).data)
    throw new PersistenceUnavailableError();
}

export async function saveMedia(name: string, bytes: Buffer) {
  if (usesPostgres()) {
    await ensureMediaBucket();
    const result = await storage().from(mediaBucket).upload(name, bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (result.error) throw new PersistenceUnavailableError();
  } else {
    const folder = resolve(
      dirname(process.env.OCULAR_DB_PATH || "data/ocular.sqlite"),
      "media",
    );
    await mkdir(folder, { recursive: true });
    await writeFile(resolve(folder, name), bytes);
  }
  return `/api/media/${name}`;
}
