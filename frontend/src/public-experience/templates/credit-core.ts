/**
 * Pure helpers for the "Website by <product>" footer credit. No imports, so
 * `tests/template-credit.test.mjs` can load this file directly.
 */

export const CREDIT_SOURCE = "template_credit";

/** The platform address with `?source=template_credit` (other query values kept). */
export function creditHref(productUrl: string): string {
  const base = (productUrl || "").trim();
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("source", CREDIT_SOURCE);
    return url.toString();
  } catch {
    return "";
  }
}

/** Split "Website by {product}" around the product name, keeping each language's word order. */
export function creditParts(template: string): { before: string; after: string } {
  const [before, after = ""] = (template || "").split("{product}");
  return { before, after };
}
