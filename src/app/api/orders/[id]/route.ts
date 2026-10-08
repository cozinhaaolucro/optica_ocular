import { cookies } from "next/headers";
import { hashToken } from "@/lib/auth";
import { getOrder, publicOrder } from "@/lib/orders";
import { privateJson, apiError } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const o = await getOrder(id);
    const token = (await cookies()).get(`ocular-order-${id}`)?.value;
    if (!o || !token || hashToken(token) !== o.token)
      return privateJson(
        { error: "Pedido não encontrado neste navegador." },
        404,
      );
    return privateJson({ order: publicOrder(o) });
  } catch (error) {
    return apiError(error);
  }
}
