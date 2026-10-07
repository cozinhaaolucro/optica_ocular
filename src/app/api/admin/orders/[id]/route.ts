import { requireAdmin } from "@/lib/auth";
import { publicOrder, updateFulfillment } from "@/lib/orders";
import { apiError, privateJson, readJson, sameOrigin } from "@/lib/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson({
      order: publicOrder(
        updateFulfillment((await params).id, await readJson(request)),
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
