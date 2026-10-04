import type { CompiledDesign, LocalizedText, PublicSection } from "../types";

const LINK_RE = /^(https?:\/\/|mailto:|tel:|\/)[^\s<>"']*$/;

export type ContentRecord = Record<string, unknown>;

export function record(value: unknown): ContentRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ContentRecord
    : {};
}

export function records(value: unknown): ContentRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

export function localized(value: unknown, locale: string): string {
  const source = record(value) as LocalizedText;
  return source[locale] || source.en || Object.values(source)[0] || "";
}

export function section(snapshotSections: PublicSection[], type: string): ContentRecord {
  return record(snapshotSections.find((item) => item.type === type)?.content);
}

export function safeHref(value: unknown): string | undefined {
  return typeof value === "string" && LINK_RE.test(value) ? value : undefined;
}

/** Keep the visitor's language on the site's own booking handoff. */
export function localeHref(href: string, locale: string): string {
  if (!locale || locale === "en" || !/^\/[^/?#]+\/book$/.test(href)) return href;
  return `${href}?locale=${encodeURIComponent(locale)}`;
}

export function action(value: unknown, locale: string): { href: string; label: string } | null {
  const item = record(value);
  const href = safeHref(item.href);
  const label = localized(item.label, locale);
  return href && label ? { href: localeHref(href, locale), label } : null;
}

export function asset(design: CompiledDesign, role: string) {
  return design.assets[role] || design.assets["section.detail"] || design.assets["hero.primary"];
}

export function brandLogo(design: CompiledDesign): string | undefined {
  const value = design.identity.logoCompact || design.identity.logoPrimary;
  return typeof value === "string" && (value.startsWith("/assets/appointment/") || value.startsWith("/files/")) && !value.includes("..") && !/[\\\s?#<>"']/.test(value)
    ? value
    : undefined;
}

export function localAsset(value: unknown, fallback: string): string {
  return typeof value === "string"
    && value.startsWith("/assets/appointment/")
    && !value.includes("..") ? value : fallback;
}

export interface ContentImage {
  src: string;
  alt: string;
}

/** An owner photo from release content. Missing alt text means decoration. */
export function contentImage(value: unknown, locale: string): ContentImage | null {
  const item = record(value);
  const src = localAsset(item.image, "");
  return src ? { src, alt: localized(item.imageAlt, locale) } : null;
}

/** A recipe image role with the alt text recorded in the imagery manifest. */
export function designImage(design: CompiledDesign, role: string): ContentImage | null {
  const found = design.assets[role];
  return found?.src ? { src: found.src, alt: found.alt || "" } : null;
}

/** The first image a section can show: its own content photo, then the recipe role. */
export function sectionImage(value: unknown, locale: string, design: CompiledDesign, role = "section.detail"): ContentImage | null {
  return contentImage(value, locale) || designImage(design, role);
}

export function formatPrice(price: unknown, currency: unknown, locale: string): string {
  if (typeof price !== "number" || !Number.isFinite(price)) return "";
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "";
  const amount = new Intl.NumberFormat(locale === "am" ? "am-ET" : "en", { maximumFractionDigits: 0 }).format(price);
  return code ? `${code} ${amount}` : amount;
}

export function durationMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
