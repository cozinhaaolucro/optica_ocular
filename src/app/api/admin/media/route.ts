import { randomUUID } from "node:crypto";
import { saveMedia } from "@/lib/media";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";
import { apiError, sameOrigin, privateJson } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Selecione uma imagem.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 4.25 * 1024 * 1024) {
        await reader.cancel();
        throw new Error(
          "A imagem precisa ser preparada antes de enviar. Tente novamente pelo painel.",
        );
      }
      chunks.push(part.value);
    }
    const body = new Uint8Array(Buffer.concat(chunks));
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      file.size > 4 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new Error("Use JPG, PNG ou WebP de até 4 MB após preparação.");
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    }).rotate();
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      throw new Error("O arquivo deve ser uma imagem JPG, PNG ou WebP válida.");
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 600 ||
      metadata.height < 450
    )
      throw new Error("A imagem deve ter pelo menos 600 × 450 px.");
    const name = `${randomUUID()}.webp`;
    const path = await saveMedia(
      name,
      await image
        .resize(1600, 1200, {
          fit: "contain",
          background: "#ffffff",
          withoutEnlargement: true,
        })
        .webp({ quality: 88 })
        .toBuffer(),
    );
    return privateJson({ path }, 201);
  } catch (e) {
    return apiError(e);
  }
}
