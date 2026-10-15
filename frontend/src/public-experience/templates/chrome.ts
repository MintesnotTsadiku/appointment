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
  | "navLabel" | "journal" | "gallery" | "services" | "team" | "visit" | "questions" | "backToSite"
  | "dark" | "light" | "switchToDark" | "switchToLight" | "skip"
  | "minutes" | "duration" | "price" | "phone" | "email" | "hours" | "address" | "step"
  | "websiteBy"
  | "approach" | "sessions" | "free" | "bookThis" | "callNumber"
  | "formatInPerson" | "formatOnline" | "formatPhone" | "areaMap" | "goodToKnow"
  // Template kit (v3): time of day, opening hours, live availability, lookbook, reviews and rooms.
  | "greetingMorning" | "greetingAfternoon" | "greetingEvening" | "greetingNight"
  | "openNow" | "opensToday" | "opensOn" | "habeshaTime" | "internationalTime" | "clockFormat"
  | "nextFree" | "nextFreeChair" | "today" | "tomorrow" | "leftToday" | "leftTodayOne" | "seeAllTimes" | "bookWith"
  | "lookbook" | "nextLook" | "previousLook" | "lookOf" | "before" | "after" | "compare" | "previous" | "next"
  | "pauseReviews" | "playReviews" | "onThisPage" | "rooms" | "copyAddress" | "copied" | "call" | "loadingSite"
  | "lookBraids" | "lookTaper" | "lookSilk" | "menu" | "stillUnsure";

export interface PublicChrome {
  t: (key: ChromeKey, values?: Record<string, string | number>) => string;
  modeName: (mode: ResolvedMode) => string;
  modeSwitchLabel: (mode: ResolvedMode) => string;
}

const catalogs = new Map<string, Promise<Record<string, string>>>();
// Catalogs that have arrived: a page that renders after its catalog arrived paints its own language at once.
const loadedCatalogs = new Map<string, Record<string, string>>();

/** The server catalog of a language, requested once per page (prefetch.ts starts it before the first render). */
export function loadChromeMessages(locale: string): Promise<Record<string, string>> {
  if (locale === "en") return Promise.resolve({});
  let pending = catalogs.get(locale);
  if (!pending) {
    pending = fetch(`/api/method/appointment.scheduler.translation.messages?language=${encodeURIComponent(locale)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => (body?.message?.messages as Record<string, string> | undefined) || {})
      .catch(() => ({}))
      .then((messages) => {
        loadedCatalogs.set(locale, messages);
        return messages;
      });
    catalogs.set(locale, pending);
  }
  return pending;
}

export function usePublicChrome(locale: string): PublicChrome {
  const [messages, setMessages] = useState<Record<string, string>>(() => loadedCatalogs.get(locale) || {});

  useEffect(() => {
    let active = true;
    loadChromeMessages(locale).then((next) => {
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
