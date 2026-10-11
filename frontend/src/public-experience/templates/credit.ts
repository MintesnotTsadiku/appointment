import { usePlatformBrand } from "@/lib/platform-brand";
import type { PublicChrome } from "./chrome";
import { creditHref, creditParts } from "./credit-core";

export interface TemplateCredit {
  href: string;
  product: string;
  before: string;
  after: string;
}

/**
 * Headless data for the footer credit that each template draws in its own style.
 * Null while the platform brand is loading (no flash of a fallback name), when the
 * platform turns `template_credit_enabled` off, or when no product address is known.
 * Template public pages do not show `PoweredBy`, so the credit is the page's only one.
 */
export function useTemplateCredit(chrome: PublicChrome): TemplateCredit | null {
  const brand = usePlatformBrand();
  const href = creditHref(brand.productUrl);
  if (!brand.loaded || !brand.growth.templateCreditEnabled || !href || !brand.productName) return null;
  return { href, product: brand.productName, ...creditParts(chrome.t("websiteBy")) };
}
