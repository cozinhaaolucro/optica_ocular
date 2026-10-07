import { requireAdmin } from "@/lib/auth";
import { listOrders, publicOrder } from "@/lib/orders";
import { apiError, privateJson } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson({ orders: listOrders().map(publicOrder) });
  } catch (e) {
    return apiError(e, 401);
  }
}
