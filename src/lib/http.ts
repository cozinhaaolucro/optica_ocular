import "server-only";
import { ZodError } from "zod";
import { createHash } from "node:crypto";
import { rateLimit } from "./persistence";
import { PersistenceUnavailableError } from "./storage-mode";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.OCULAR_SITE_URL || request.url).origin;
  const url = new URL(request.url);
  const local =
    process.env.VERCEL !== "1" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    origin === url.origin;
  if (!origin || (origin !== allowed && !local))
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
export async function limited(request: Request, area: string, limit = 30) {
  const ip =
    process.env.OCULAR_TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
      : "local";
  const key = createHash("sha256").update(`${area}:${ip}`).digest("hex");
  if (!(await rateLimit(key, limit)))
    throw Object.assign(
      new Error("Muitas tentativas. Aguarde um minuto e tente novamente."),
      { status: 429 },
    );
}
export function apiError(error: unknown, status = 400) {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  )
    status = error.status;
  if (error instanceof PersistenceUnavailableError)
    return privateJson({ error: error.message }, 503);
  if (error instanceof ZodError)
    return privateJson(
      {
        error: "Confira os dados informados.",
        fields: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      status,
    );
  const message =
    error instanceof Error
      ? error.message
      : "Não foi possível concluir. Tente novamente.";
  if (message.includes("SQLITE") || message.includes("ENOENT")) {
    return privateJson(
      { error: "Serviço temporariamente indisponível. Tente novamente." },
      503,
    );
  }
  return privateJson({ error: message }, status);
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
