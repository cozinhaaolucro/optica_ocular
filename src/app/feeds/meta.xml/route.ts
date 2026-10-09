import { serveProductFeed } from "@/lib/marketing-server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET() {
  return serveProductFeed("meta");
}
