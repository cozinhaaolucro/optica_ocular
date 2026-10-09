import type { Product } from "./types";
import { hasVariantPhotos } from "./product";
export function productIssues(p: Product) {
  const issues: string[] = [];
  if (
    new Set(
      p.images.filter((image) => image && !image.includes("/placeholders/")),
    ).size < 3
  )
    issues.push("Três fotografias");
  if (!p.material.trim()) issues.push("Material");
  if (!p.priceConfirmed) issues.push("Confirmação dos preços");
  if (
    p.variants.some(
      (v) =>
        !v.sku.trim() ||
        !v.color.trim() ||
        !v.lensWidth ||
        !v.bridge ||
        !v.temple,
    )
  )
    issues.push("SKU, cor e medidas das variantes");
  if (!p.verified) issues.push("Conferência da ficha");
  if (!hasVariantPhotos(p)) issues.push("Fotografia de cada cor");
  return issues;
}
export const serviceLabels = {
  new: "Novo",
  contacted: "Em atendimento",
  quoted: "Orçamento enviado",
  completed: "Concluído",
  cancelled: "Encerrado",
} as const;
export const activityLabels: Record<string, string> = {
  admin_login: "Acesso da equipe",
  catalog_updated: "Cadastro salvo",
  inventory_updated: "Estoque ou preço ajustado",
  catalog_visibility: "Exibição do catálogo alterada",
  order_created: "Nova solicitação",
  service_updated: "Atendimento atualizado",
  lens_prices_updated: "Tabela de lentes atualizada",
  fulfillment_updated: "Entrega atualizada",
  order_released: "Reserva liberada",
};
export function csv(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
            return '"' + safe.replace(/"/g, '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
