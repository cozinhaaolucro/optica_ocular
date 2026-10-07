import type { Order } from "./types";

// The provider is deliberately undecided. No production route creates charges.
// Implement and homologate this contract after the client's provider selection.
export interface PaymentAdapter {
  createCheckout(
    order: Order,
    idempotencyKey: string,
  ): Promise<{ id: string; url: string }>;
  getPayment(id: string): Promise<{
    id: string;
    orderId: string;
    status:
      "awaiting_payment" | "paid" | "payment_failed" | "cancelled" | "refunded";
    amountCents: number;
    currency: string;
  }>;
  validateWebhook(request: Request): Promise<{ paymentId: string }>;
  cancel(paymentId: string, idempotencyKey: string): Promise<void>;
  refund(
    paymentId: string,
    amountCents: number,
    idempotencyKey: string,
  ): Promise<void>;
}
