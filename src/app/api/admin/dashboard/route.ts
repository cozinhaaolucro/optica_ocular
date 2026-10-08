import { requireAdmin } from "@/lib/auth";
import { dashboard } from "@/lib/admin";
import { apiError, privateJson } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson(await dashboard());
  } catch (error) {
    return apiError(error, 401);
  }
}
