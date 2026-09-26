import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { fetchPublicConfig } from "./api";
import { buildThemeAttributes, type ThemeAttributes, type ThemePreference } from "./firstPaint";
import { getFallbackPublicUIConfig } from "./tokens";
import type { PublicUIConfig } from "./types";

const PREFERENCE_KEY = "pe-display-mode";

interface PublicExperienceValue {
  config: PublicUIConfig;
  theme: ThemeAttributes;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  refresh: () => void;
  isLoading: boolean;
  error: string | null;
}

const PublicExperienceContext = createContext<PublicExperienceValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function storedPreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(PREFERENCE_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export const PublicExperienceProvider = ({
  children,
  locale,
}: PropsWithChildren<{ locale?: string }>) => {
  const [config, setConfig] = useState<PublicUIConfig>(() => getFallbackPublicUIConfig(locale));
  const [preference, setPreferenceState] = useState<ThemePreference>(() => storedPreference());
  const [dark, setDark] = useState<boolean>(() => systemPrefersDark());
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, []);

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    fetchPublicConfig(locale)
      .then((next) => {
        if (!active) return;
        setConfig(next);
        setError(null);
      })
      .catch(() => {
        if (active) setError("published_design_unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => refresh(), [refresh]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      /* A display preference is optional. */
    }
  }, []);

  useEffect(() => {
    const favicon = config.identity.favicon;
    if (typeof document === "undefined" || typeof favicon !== "string" || !favicon.startsWith("/assets/appointment/") && !favicon.startsWith("/files/") || favicon.includes("..") || /[\\\s?#<>"']/.test(favicon)) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~=icon][data-public-experience]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.publicExperience = "true";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [config.identity.favicon]);

  const theme = useMemo(
    () => buildThemeAttributes(config, preference, dark),
    [config, preference, dark],
  );

  const value = useMemo<PublicExperienceValue>(
    () => ({ config, theme, preference, setPreference, refresh, isLoading, error }),
    [config, theme, preference, setPreference, refresh, isLoading, error],
  );

  return <PublicExperienceContext.Provider value={value}>{children}</PublicExperienceContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePublicExperience = (): PublicExperienceValue => {
  const value = useContext(PublicExperienceContext);
  if (!value) throw new Error("usePublicExperience must be used within PublicExperienceProvider");
  return value;
};
