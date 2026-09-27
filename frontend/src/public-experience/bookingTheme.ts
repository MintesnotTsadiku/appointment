import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { fetchPublicConfig } from "./api";
import { publicRootForSlug } from "./routes";
import type { PublicUIConfig } from "./types";

type BookingMode = "light" | "dark";
type BookingStyle = CSSProperties & Record<`--${string}`, string>;

export function bookingBrandVariables(config: PublicUIConfig, mode: BookingMode): BookingStyle {
  const design = config.compiledDesign;
  const colors = design.tokens[mode] || design.tokens.light;
  const font = design.typography.roles.body?.family || "sans-serif";
  const display = design.typography.roles.display?.family || font;
  const shadow = String((design.surface.elevation as Record<string, unknown> | undefined)?.card || "0 12px 36px rgba(0,0,0,.08)");
  const value = (role: string, fallback: string) => colors[role] || fallback;
  const primary = value("primary", "#713b2e");
  const accent = value("accent", primary);
  const success = value("success", "#247553");
  // Translucent cards can overlap the shell's decorative pattern.
  const secondaryText = `color-mix(in srgb, ${value("text", "#111827")} 35%, ${value("textMuted", "#4b5563")})`;
  return {
    "--bg-primary": value("canvas", "#ffffff"),
    "--bg-secondary": value("surfaceMuted", "#f7f7f7"),
    "--bg-tertiary": value("surfaceStrong", "#eeeeee"),
    "--bg-elevated": value("surface", "#ffffff"),
    "--text-primary": value("text", "#111827"),
    "--text-secondary": secondaryText,
    "--text-muted": secondaryText,
    "--text-subtle": value("disabled", "#9ca3af"),
    "--border-subtle": `color-mix(in srgb, ${value("border", "#e5e7eb")} 45%, transparent)`,
    "--border-default": value("border", "#e5e7eb"),
    "--border-strong": value("surfaceStrong", "#d1d5db"),
    "--accent-primary": primary,
    "--booking-action-text": `color-mix(in srgb, ${value("text", "#111827")} 40%, ${primary})`,
    "--accent-primary-hover": value("selected", primary),
    "--accent-primary-light": `color-mix(in srgb, ${primary} 18%, transparent)`,
    "--accent-secondary": accent,
    "--accent-secondary-hover": value("link", accent),
    "--accent-secondary-light": `color-mix(in srgb, ${accent} 18%, transparent)`,
    "--accent-success": success,
    "--accent-success-hover": value("available", success),
    "--accent-success-light": `color-mix(in srgb, ${success} 18%, transparent)`,
    "--gradient-primary-from": primary,
    "--gradient-primary-to": accent,
    "--gradient-secondary-from": accent,
    "--gradient-secondary-to": value("limitedCapacity", accent),
    "--gradient-success-from": success,
    "--gradient-success-to": value("available", success),
    "--glow-primary": `color-mix(in srgb, ${primary} 18%, transparent)`,
    "--glow-secondary": `color-mix(in srgb, ${accent} 14%, transparent)`,
    "--glow-success": `color-mix(in srgb, ${success} 10%, transparent)`,
    "--shadow-sm": shadow,
    "--shadow-md": shadow,
    "--shadow-lg": shadow,
    "--booking-font-body": `'${font}', sans-serif`,
    "--booking-font-display": `'${display}', serif`,
    "--booking-radius": String((design.surface.shape as Record<string, unknown> | undefined)?.cardRadius || "18px"),
    "--pe-color-primary": primary,
    "--pe-color-on-primary": value("onPrimary", "#ffffff"),
    "--pe-color-text": value("text", "#111827"),
    "--pe-font-ui": `'${font}', sans-serif`,
    fontFamily: `var(--booking-font-body)`,
  };
}

export function useBookingBrand(orgSlug: string | undefined, mode: BookingMode) {
  const [config, setConfig] = useState<PublicUIConfig | null>(null);
  useEffect(() => {
    let active = true;
    setConfig(null);
    if (!orgSlug) return () => { active = false; };
    fetchPublicConfig(undefined, publicRootForSlug(orgSlug))
      .then((next) => { if (active && next.source === "experience-release") setConfig(next); })
      .catch(() => { if (active) setConfig(null); });
    return () => { active = false; };
  }, [orgSlug]);
  return useMemo(() => ({
    config,
    publicRoot: publicRootForSlug(orgSlug),
    style: config ? bookingBrandVariables(config, mode) : undefined,
  }), [config, mode, orgSlug]);
}
