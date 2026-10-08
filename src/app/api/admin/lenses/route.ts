import { requireAdmin } from "@/lib/auth";
import { getLenses, saveLensPrices, updateLensGroup } from "@/lib/lenses";
import { apiError, privateJson, readJson, sameOrigin } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return privateJson(await getLenses());
  } catch (error) {
    return apiError(error, 401);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson(await saveLensPrices(await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return privateJson(await updateLensGroup(await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
