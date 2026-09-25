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

export function action(value: unknown, locale: string): { href: string; label: string } | null {
  const item = record(value);
  const href = safeHref(item.href);
  const label = localized(item.label, locale);
  return href && label ? { href, label } : null;
}

export function asset(design: CompiledDesign, role: string) {
  return design.assets[role] || design.assets["section.detail"] || design.assets["hero.primary"];
}

export function brandLogo(design: CompiledDesign): string | undefined {
  const value = design.identity.logoCompact || design.identity.logoPrimary;
  return typeof value === "string" && value.startsWith("/assets/appointment/") && !value.includes("..")
    ? value
    : undefined;
}

export function localAsset(value: unknown, fallback: string): string {
  return typeof value === "string"
    && value.startsWith("/assets/appointment/")
    && !value.includes("..") ? value : fallback;
}

export function supportAsset(site: string, scene: number): string {
  return `/assets/appointment/brand-experience/support/${site}/scene-${scene}.webp`;
}
