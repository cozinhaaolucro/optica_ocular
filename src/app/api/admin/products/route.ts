import { requireAdmin } from "@/lib/auth";
import { getProducts, saveProduct } from "@/lib/catalog";
import { setPublished } from "@/lib/admin";
import { apiError, privateJson, readJson, sameOrigin } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson({ products: await getProducts(true) });
  } catch (e) {
    return apiError(e, 401);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson({
      products: await setPublished(await readJson(request)),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson({ product: await saveProduct(await readJson(request)) });
  } catch (e) {
    return apiError(e);
  }
}
