import { requireAdmin } from "@/lib/auth";
import { listOrders, adminOrder } from "@/lib/orders";
import { apiError, privateJson } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson({ orders: (await listOrders()).map(adminOrder) });
  } catch (e) {
    return apiError(e, 401);
  }
}
