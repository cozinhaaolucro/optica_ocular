import "server-only";
import type { StoreConfig } from "./types";
import { getProducts } from "./catalog";
import { canSell } from "./product";
export function siteUrl() {
  return (process.env.OCULAR_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
export async function storeConfig(): Promise<StoreConfig> {
  return {
    paymentsEnabled: false,
    shippingEnabled: false,
    pickupEnabled: process.env.OCULAR_PICKUP_ENABLED !== "false",
    telemetryEnabled: process.env.OCULAR_TELEMETRY_ENABLED === "true",
    catalogReady: (await getProducts()).some(canSell),
  };
}
