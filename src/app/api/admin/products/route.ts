import { requireAdmin } from "@/lib/auth";
import { getProducts, saveProduct } from "@/lib/catalog";
import { apiError, privateJson, readJson, sameOrigin } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson({ products: getProducts(true) });
  } catch (e) {
    return apiError(e, 401);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson({ product: saveProduct(await readJson(request)) });
  } catch (e) {
    return apiError(e);
  }
}
