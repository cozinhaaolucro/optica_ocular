import { getLensData } from "@/lib/lenses";
import { apiError, privateJson } from "@/lib/http";
export async function GET() {
  try {
    return privateJson(await getLensData());
  } catch (error) {
    return apiError(error);
  }
}
