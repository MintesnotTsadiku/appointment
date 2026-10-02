import { useEffect, useMemo, useState } from "react";

import { getTranslation } from "@/lib/i18n";
import type { ResolvedMode } from "../firstPaint";

/**
 * Translated platform strings for public template chrome: navigation, the mode
 * switch, "Back to site" and field labels. Business copy never comes from here;
 * it comes from the release content.
 *
 * The page locale decides the language, not the visitor's staff-app preference.
 * Translations come from the Frappe `Translation` DocType like the rest of the app.
 */
export type ChromeKey =
  | "navLabel" | "services" | "team" | "visit" | "questions" | "backToSite"
  | "dark" | "light" | "switchToDark" | "switchToLight" | "skip"
  | "minutes" | "duration" | "price" | "phone" | "email" | "hours" | "address" | "step";

export interface PublicChrome {
  t: (key: ChromeKey, values?: Record<string, string | number>) => string;
  modeName: (mode: ResolvedMode) => string;
  modeSwitchLabel: (mode: ResolvedMode) => string;
}

const catalogs = new Map<string, Promise<Record<string, string>>>();

function loadMessages(locale: string): Promise<Record<string, string>> {
  if (locale === "en") return Promise.resolve({});
  let pending = catalogs.get(locale);
  if (!pending) {
    pending = fetch(`/api/method/appointment.scheduler.translation.messages?language=${encodeURIComponent(locale)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => (body?.message?.messages as Record<string, string> | undefined) || {})
      .catch(() => ({}));
    catalogs.set(locale, pending);
  }
  return pending;
}

export function usePublicChrome(locale: string): PublicChrome {
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    loadMessages(locale).then((next) => {
      if (active) setMessages(next);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  return useMemo(() => {
    const t = (key: ChromeKey, values: Record<string, string | number> = {}) =>
      getTranslation(locale, `publicSite.${key}`, messages)
        .replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
    return {
      t,
      modeName: (mode) => t(mode === "dark" ? "light" : "dark"),
      modeSwitchLabel: (mode) => t(mode === "dark" ? "switchToLight" : "switchToDark"),
    };
  }, [locale, messages]);
}
