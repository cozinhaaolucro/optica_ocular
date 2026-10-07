export interface Variant {
  id: string;
  sku: string;
  label: string;
  color: string;
  lensWidth: number | null;
  bridge: number | null;
  temple: number | null;
  priceCents: number;
  stock: number;
}
export interface Product {
  revision: number;
  id: string;
  slug: string;
  name: string;
  category: "grau" | "sol";
  brand: string;
  description: string;
  material: string;
  features: string[];
  tags: string[];
  images: string[];
  verified: boolean;
  priceConfirmed: boolean;
  published: boolean;
  variants: Variant[];
  package: {
    width: number;
    height: number;
    length: number;
    weight: number;
  } | null;
}
export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}
export interface CartItem extends CartLine {
  name: string;
  brand: string;
  slug: string;
  category: string;
  variantLabel: string;
  priceCents: number;
  image: string;
  available: boolean;
}
export interface ShippingOption {
  id: string;
  label: string;
  priceCents: number;
  days: number | null;
}
export type OrderStatus =
  | "quote_requested"
  | "payment_creating"
  | "awaiting_payment"
  | "paid"
  | "payment_failed"
  | "cancelled"
  | "refunded"
  | "review_required";
export interface Customer {
  name: string;
  email: string;
  phone: string;
}
export interface Address {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}
export interface Order {
  id: string;
  number: string;
  token: string;
  idempotencyKey: string;
  status: OrderStatus;
  customer: Customer;
  address: Address | null;
  items: CartItem[];
  subtotalCents: number;
  shipping: ShippingOption;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  paymentId: string | null;
  paymentUrl: string | null;
  reserved: boolean;
  fulfillment: "unfulfilled" | "ready" | "shipped" | "collected";
  tracking: string;
  note: string;
}
export interface StoreConfig {
  paymentsEnabled: boolean;
  shippingEnabled: boolean;
  pickupEnabled: boolean;
  telemetryEnabled: boolean;
  catalogReady: boolean;
}
