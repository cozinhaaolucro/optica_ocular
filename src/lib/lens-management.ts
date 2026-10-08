import { normalizeSearch } from "./admin-utils";

export interface LensRow {
  id: string;
  brand: string;
  category: string;
  line: string;
  option: string;
  material: string;
  index: string;
  treatment: string;
  priceCents: number;
  promotionPriceCents: number | null;
  enabled: boolean;
}
export interface LensFilter {
  brand?: string;
  category?: string;
  line?: string;
  query?: string;
  status?: "all" | "active" | "hidden" | "promotion";
}
export type LensBulkAction =
  | { type: "visibility"; enabled: boolean }
  | { type: "promotion"; percent: number | null }
  | { type: "adjust"; percent: number };
export interface LensEdit {
  price?: string;
  promotion?: string;
  enabled?: boolean;
}
export function matchesLensFilter(row: LensRow, filter: LensFilter) {
  return (
    (!filter.brand || row.brand === filter.brand) &&
    (!filter.category || row.category === filter.category) &&
    (!filter.line || row.line === filter.line) &&
    (!filter.query ||
      normalizeSearch(
        `${row.brand} ${row.category} ${row.line} ${row.option} ${row.material} ${row.index} ${row.treatment}`,
      ).includes(normalizeSearch(filter.query.trim()))) &&
    (!filter.status ||
      filter.status === "all" ||
      (filter.status === "active" && row.enabled) ||
      (filter.status === "hidden" && !row.enabled) ||
      (filter.status === "promotion" && row.promotionPriceCents !== null))
  );
}
export const lensDecimal = (value: number) =>
  (value / 100).toFixed(2).replace(".", ",");
export const lensCents = (value: string) =>
  /^\d+(?:[.,]\d{1,2})?$/.test(value.trim())
    ? Math.round(Number(value.trim().replace(",", ".")) * 100)
    : NaN;
