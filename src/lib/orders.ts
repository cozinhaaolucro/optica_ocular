import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db, transaction, audit } from "./db";
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
export function getOrder(id: string): Order | undefined {
  const row = db().prepare("SELECT body FROM orders WHERE id=?").get(id) as
    { body: string } | undefined;
  return row ? JSON.parse(row.body) : undefined;
}
export function listOrders(): Order[] {
  return (
    db()
      .prepare("SELECT body FROM orders ORDER BY rowid DESC LIMIT 200")
      .all() as { body: string }[]
  ).map((r) => JSON.parse(r.body));
}
function saveOrder(o: Order) {
  db()
    .prepare("INSERT OR REPLACE INTO orders VALUES (?,?,?,?)")
    .run(o.id, o.token, o.idempotencyKey, JSON.stringify(o));
}
export function createOrder(
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
  return transaction(() => {
    const existing = db()
      .prepare("SELECT body FROM orders WHERE idem=?")
      .get(data.idempotencyKey) as { body: string } | undefined;
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
      return { order, accessToken: null };
    }
    const items = resolveLines(data.items, selling);
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
    };
    if (selling)
      for (const line of items) {
        const p = getProduct(line.productId)!;
        p.variants.find((v) => v.id === line.variantId)!.stock -= line.quantity;
        p.revision += 1;
        db()
          .prepare("UPDATE products SET body=? WHERE id=?")
          .run(JSON.stringify(p), p.id);
      }
    saveOrder(order);
    db()
      .prepare("INSERT INTO notifications(id,body) VALUES (?,?)")
      .run(
        order.id,
        JSON.stringify({ type: "order_created", orderId: order.id }),
      );
    audit("order_created", { orderId: order.id, status: order.status });
    return { order, accessToken };
  });
}
export function releaseOrder(
  id: string,
  status: "payment_failed" | "cancelled" | "refunded",
) {
  return transaction(() => {
    const o = getOrder(id);
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
    releaseInventory(o);
    o.status = status;
    o.updatedAt = new Date().toISOString();
    saveOrder(o);
    audit("order_released", { orderId: id, status });
    return o;
  });
}
function releaseInventory(o: Order) {
  if (!o.reserved) return;
  for (const item of o.items) {
    const p = getProduct(item.productId),
      v = p?.variants.find((v) => v.id === item.variantId);
    if (!p || !v)
      throw new Error(
        "A variante reservada foi removida. Revise o cadastro antes de liberar o estoque.",
      );
    v.stock += item.quantity;
    p.revision += 1;
    db()
      .prepare("UPDATE products SET body=? WHERE id=?")
      .run(JSON.stringify(p), p.id);
  }
  o.reserved = false;
}
export function reconcilePayment(
  id: string,
  payment: {
    id: string;
    status: OrderStatus;
    amountCents: number;
    currency: string;
  },
) {
  return transaction(() => {
    const o = getOrder(id);
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
        audit("payment_review", { orderId: id });
        return o;
      }
      o.status = "review_required";
      o.updatedAt = new Date().toISOString();
      saveOrder(o);
      audit("payment_review", { orderId: id });
      return o;
    }
    if (["refunded", "cancelled", "payment_failed"].includes(o.status))
      return o;
    if (o.status === "paid" && payment.status !== "refunded") return o;
    if (payment.status === "refunded" && o.status !== "paid")
      throw new Error("Reembolso sem pagamento confirmado.");
    if (["payment_failed", "cancelled", "refunded"].includes(payment.status))
      releaseInventory(o);
    o.paymentId = payment.id;
    o.status = payment.status;
    o.updatedAt = new Date().toISOString();
    saveOrder(o);
    audit("payment_updated", { orderId: id, status: o.status });
    return o;
  });
}
export function updateFulfillment(id: string, input: unknown) {
  const data = z
    .object({
      fulfillment: z.enum(["unfulfilled", "ready", "shipped", "collected"]),
      tracking: z.string().trim().max(250),
      note: z.string().trim().max(1000),
    })
    .strict()
    .parse(input);
  return transaction(() => {
    const o = getOrder(id);
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status !== "paid" && data.fulfillment !== "unfulfilled")
      throw new Error("Confirme o pagamento antes de liberar um pedido.");
    Object.assign(o, data, { updatedAt: new Date().toISOString() });
    saveOrder(o);
    audit("fulfillment_updated", { orderId: id });
    return o;
  });
}
export function publicOrder(o: Order) {
  const { token, idempotencyKey, ...rest } = o;
  void token;
  void idempotencyKey;
  return rest;
}
