import { getProducts } from "@/lib/catalog";
import { storeConfig } from "@/lib/config";
import { privateJson } from "@/lib/http";
export function GET() {
  return privateJson({ products: getProducts(), config: storeConfig() });
}
