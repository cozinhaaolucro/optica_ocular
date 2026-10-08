import { cookies } from "next/headers";
import { createOrder } from "@/lib/orders";
import {
  apiError,
  limited,
  privateJson,
  readJson,
  sameOrigin,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limited(request, "orders", 15);
    const { order, accessToken } = await createOrder(await readJson(request));
    if (accessToken)
      (await cookies()).set(`ocular-order-${order.id}`, accessToken, {
        httpOnly: true,
        secure: request.url.startsWith("https:"),
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60,
        path: "/",
      });
    return privateJson(
      { order: { id: order.id, number: order.number, status: order.status } },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
