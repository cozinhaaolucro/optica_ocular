import { getProducts } from "@/lib/catalog";
import { storeConfig } from "@/lib/config";
import { privateJson, apiError } from "@/lib/http";
export async function GET() {
  try {
    return privateJson({
      products: await getProducts(),
      config: await storeConfig(),
    });
  } catch (error) {
    return apiError(error);
  }
}
