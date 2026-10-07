import "server-only";
import { ZodError } from "zod";
import { createHash } from "node:crypto";
import { rateLimit, audit } from "./db";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.OCULAR_SITE_URL || request.url).origin;
  if (!origin || origin !== allowed)
    throw new Error("Origem da solicitação inválida.");
}
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Envie os dados em JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Solicitação vazia.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 64000) {
      await reader.cancel();
      throw new Error("Solicitação muito grande.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Dados inválidos.");
  }
}
export function limited(request: Request, area: string, limit = 30) {
  const ip =
    process.env.OCULAR_TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
      : "local";
  const key = createHash("sha256").update(`${area}:${ip}`).digest("hex");
  if (!rateLimit(key, limit))
    throw new Error("Muitas tentativas. Aguarde um minuto e tente novamente.");
}
export function apiError(error: unknown, status = 400) {
  if (error instanceof ZodError)
    return Response.json(
      {
        error: "Confira os dados informados.",
        fields: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status },
    );
  const message =
    error instanceof Error
      ? error.message
      : "Não foi possível concluir. Tente novamente.";
  if (message.includes("SQLITE") || message.includes("ENOENT")) {
    audit("server_error", { code: "storage" });
    return Response.json(
      { error: "Serviço temporariamente indisponível. Tente novamente." },
      { status: 503 },
    );
  }
  return Response.json({ error: message }, { status });
}
export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
