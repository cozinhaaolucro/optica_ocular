import { requireAdmin } from "@/lib/auth";
import { updateInventory } from "@/lib/admin";
import { apiError, privateJson, readJson, sameOrigin } from "@/lib/http";
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson({
      product: await updateInventory(await readJson(request)),
    });
  } catch (error) {
    return apiError(error);
  }
}
