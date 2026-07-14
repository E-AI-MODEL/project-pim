export type ProductMode = "quick" | "start" | "write";

export const PRODUCT_MODES: ProductMode[] = ["quick", "start", "write"];

export function isProductMode(v: unknown): v is ProductMode {
  return v === "quick" || v === "start" || v === "write";
}