import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { query, execute, transaction, audit } from "./persistence";
import { getProduct, resolveLines, linesSchema } from "./catalog";
import { hashToken } from "./auth";
import type { Order, OrderStatus, ShippingOption } from "./types";

export const orderSchema = z
  .object({
    items: linesSchema,
    customer: z
      .object({
        name: z.string().trim().min(3).max(120),
        email: z.email().max(200),
        phone: z
          .string()
          .transform((v) => v.replace(/\D/g, ""))
          .pipe(z.string().regex(/^\d{10,11}$/)),
      })
      .strict(),
    idempotencyKey: z.uuid(),
    privacyAccepted: z.literal(true),
  })
  .strict();
export async function getOrder(id: string): Promise<Order | undefined> {
  const [row] = await query<{ body: string }>(
    "SELECT body FROM orders WHERE id=?",
    [id],
  );
  return row ? JSON.parse(row.body) : undefined;
}
export async function listOrders(): Promise<Order[]> {
  return (await query<{ body: string }>("SELECT body FROM orders"))
    .map((r) => JSON.parse(r.body) as Order)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function saveOrder(o: Order) {
  await execute(
    "INSERT INTO orders(id,token,idem,body) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,idem=excluded.idem,body=excluded.body",
    [o.id, o.token, o.idempotencyKey, JSON.stringify(o)],
  );
}
export async function createOrder(
  input: unknown,
  selling = false,
  shipping: ShippingOption = {
    id: "pickup",
    label: "Retirada na loja, a combinar",
    priceCents: 0,
    days: null,
  },
) {
  const data = orderSchema.parse(input);
  return transaction(async () => {
    const [existing] = await query<{ body: string }>(
      "SELECT body FROM orders WHERE idem=?",
      [data.idempotencyKey],
    );
    if (existing) {
      const order: Order = JSON.parse(existing.body);
      if (
        JSON.stringify(
          order.items.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
          })),
        ) !== JSON.stringify(data.items) ||
        JSON.stringify(order.customer) !== JSON.stringify(data.customer)
      )
        throw new Error("O carrinho mudou. Inicie uma nova solicitação.");
      // Recover confirmation even when the first response was lost before setting its cookie.
      const accessToken = randomBytes(32).toString("hex");
      order.token = hashToken(accessToken);
      await saveOrder(order);
      return { order, accessToken };
    }
    const items = await resolveLines(data.items, selling);
    const subtotalCents = items.reduce(
      (s, i) => s + i.priceCents * i.quantity,
      0,
    );
    const accessToken = randomBytes(32).toString("hex");
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      number: `OC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`,
      token: hashToken(accessToken),
      idempotencyKey: data.idempotencyKey,
      status: selling ? "payment_creating" : "quote_requested",
      customer: data.customer,
      address: null,
      items,
      subtotalCents,
      shipping,
      totalCents: subtotalCents + shipping.priceCents,
      createdAt: now,
      updatedAt: now,
      paymentId: null,
      paymentUrl: null,
      reserved: selling,
      fulfillment: "unfulfilled",
      tracking: "",
      note: "",
      revision: 1,
      serviceStatus: "new",
    };
    if (selling)
      for (const line of items) {
        const p = (await getProduct(line.productId))!;
        p.variants.find((v) => v.id === line.variantId)!.stock -= line.quantity;
        p.revision += 1;
        await execute("UPDATE products SET body=? WHERE id=?", [
          JSON.stringify(p),
          p.id,
        ]);
      }
    await saveOrder(order);
    await execute("INSERT INTO notifications(id,body) VALUES (?,?)", [
      order.id,
      JSON.stringify({ type: "order_created", orderId: order.id }),
    ]);
    await audit("order_created", {
      orderId: order.id,
      number: order.number,
      status: order.status,
    });
    return { order, accessToken };
  });
}
export async function releaseOrder(
  id: string,
  status: "payment_failed" | "cancelled" | "refunded",
) {
  return transaction(async () => {
    const o = await getOrder(id);
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status === "paid" && status !== "refunded")
      throw new Error(
        "Confirme o cancelamento ou reembolso no provedor antes de alterar este pedido.",
      );
    if (
      ["refunded", "cancelled", "payment_failed"].includes(o.status) &&
      !o.reserved
    )
      return o;
    await releaseInventory(o);
    o.status = status;
    o.updatedAt = new Date().toISOString();
    await saveOrder(o);
    await audit("order_released", { orderId: id, status });
    return o;
  });
}
async function releaseInventory(o: Order) {
  if (!o.reserved) return;
  for (const item of o.items) {
    const p = await getProduct(item.productId),
      v = p?.variants.find((v) => v.id === item.variantId);
    if (!p || !v)
      throw new Error(
        "A variante reservada foi removida. Revise o cadastro antes de liberar o estoque.",
      );
    v.stock += item.quantity;
    p.revision += 1;
    await execute("UPDATE products SET body=? WHERE id=?", [
      JSON.stringify(p),
      p.id,
    ]);
  }
  o.reserved = false;
}
export async function reconcilePayment(
  id: string,
  payment: {
    id: string;
    status: OrderStatus;
    amountCents: number;
    currency: string;
  },
) {
  return transaction(async () => {
    const o = await getOrder(id);
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status === "quote_requested")
      throw new Error(
        "Solicitação de orçamento não aceita confirmação de pagamento.",
      );
    if (
      ![
        "awaiting_payment",
        "paid",
        "payment_failed",
        "cancelled",
        "refunded",
      ].includes(payment.status)
    )
      throw new Error("Estado de pagamento inválido.");
    if (
      payment.amountCents !== o.totalCents ||
      payment.currency !== "BRL" ||
      (!o.reserved && payment.status === "paid") ||
      (o.paymentId && o.paymentId !== payment.id)
    ) {
      if (o.status === "paid" || o.status === "refunded") {
        await audit("payment_review", { orderId: id });
        return o;
      }
      o.status = "review_required";
      o.updatedAt = new Date().toISOString();
      await saveOrder(o);
      await audit("payment_review", { orderId: id });
      return o;
    }
    if (["refunded", "cancelled", "payment_failed"].includes(o.status))
      return o;
    if (o.status === "paid" && payment.status !== "refunded") return o;
    if (payment.status === "refunded" && o.status !== "paid")
      throw new Error("Reembolso sem pagamento confirmado.");
    if (["payment_failed", "cancelled", "refunded"].includes(payment.status))
      await releaseInventory(o);
    o.paymentId = payment.id;
    o.status = payment.status;
    o.updatedAt = new Date().toISOString();
    await saveOrder(o);
    await audit("payment_updated", { orderId: id, status: o.status });
    return o;
  });
}
export async function updateFulfillment(id: string, input: unknown) {
  const data = z
    .object({
      fulfillment: z.enum(["unfulfilled", "ready", "shipped", "collected"]),
      tracking: z.string().trim().max(250),
      note: z.string().trim().max(1000),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const o = await getOrder(id);
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status !== "paid" && data.fulfillment !== "unfulfilled")
      throw new Error("Confirme o pagamento antes de liberar um pedido.");
    Object.assign(o, data, { updatedAt: new Date().toISOString() });
    await saveOrder(o);
    await audit("fulfillment_updated", { orderId: id });
    return o;
  });
}
export function adminOrder(o: Order) {
  const { token, idempotencyKey, ...rest } = o;
  void token;
  void idempotencyKey;
  return rest;
}

export function publicOrder(o: Order) {
  const { note, revision, serviceStatus, ...rest } = adminOrder(o);
  void note;
  void revision;
  void serviceStatus;
  return rest;
}

export async function updateService(id: string, input: unknown) {
  const data = z
    .object({
      revision: z.number().int().min(0),
      serviceStatus: z.enum([
        "new",
        "contacted",
        "quoted",
        "completed",
        "cancelled",
      ]),
      note: z.string().trim().max(4000),
    })
    .strict()
    .parse(input);
  return transaction(async () => {
    const order = await getOrder(id);
    if (!order) throw new Error("Solicitação não encontrada.");
    if ((order.revision || 0) !== data.revision)
      throw new Error("Esta solicitação mudou. Atualize antes de salvar.");
    if (order.status !== "quote_requested")
      throw new Error("Use o fluxo de pedidos para alterar uma venda.");
    order.serviceStatus = data.serviceStatus;
    order.note = data.note;
    order.revision = (order.revision || 0) + 1;
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    await audit("service_updated", {
      orderId: id,
      number: order.number,
      status: data.serviceStatus,
    });
    return order;
  });
}
