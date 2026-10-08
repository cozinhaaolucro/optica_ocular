import { z } from "zod";
import { audit, execute } from "@/lib/persistence";
import { limited, readJson, sameOrigin } from "@/lib/http";
const schema = z.union([
  z
    .object({
      event: z.enum([
        "view_product",
        "add_to_cart",
        "begin_checkout",
        "quote_requested",
      ]),
      category: z.enum(["sol", "grau"]).optional(),
    })
    .strict(),
  z
    .object({
      event: z.literal("metric"),
      name: z.enum(["LCP", "CLS", "INP"]),
      value: z.number().finite().min(0).max(3600000),
    })
    .strict(),
]);
export async function POST(request: Request) {
  if (process.env.OCULAR_TELEMETRY_ENABLED !== "true")
    return new Response(null, { status: 204 });
  try {
    sameOrigin(request);
    await limited(request, "telemetry", 100);
    await audit("telemetry", schema.parse(await readJson(request)));
    await execute("DELETE FROM events WHERE type=? AND created<?", [
      "telemetry",
      new Date(Date.now() - 30 * 86400000).toISOString(),
    ]);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
