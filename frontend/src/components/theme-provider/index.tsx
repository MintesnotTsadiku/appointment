import { createContext, useContext, useLayoutEffect, useEffect, useState, useMemo, useRef } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useSession } from '@/context/session';
import type { Theme, ThemeProviderState, ThemeColors } from './types';
import { applyThemeColors, defaultThemeColors } from './useThemeColors';
import { appearanceColors, appearanceDefaults, cacheAppearance, readAppearance, fontFamilies, cachedUser, applyComponentTokens, type Appearance } from './appearance';
import './internal-appearance.css';

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);
function systemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function legacyMode(): Theme {
  try { const mode = localStorage.getItem('vite-ui-theme'); return mode === 'dark' || mode === 'light' ? mode : 'system'; } catch { return 'system'; }
}

export function ThemeProvider({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const { session, loading } = useSession();
  const user = session?.authenticated ? session.user : loading ? cachedUser() : '';
  const internal = !!user && /^\/(home|analytics|reception|calendar|settings|workspaces|onboarding)(\/|$)/.test(pathname);
  const query = useFrappeGetCall<{ message: Appearance }>('appointment.scheduler.appearance.load', undefined, internal && session?.authenticated ? `appearance-${user}` : null);
  const post = useFrappePostCall<{ message: Appearance }>('appointment.scheduler.appearance.save');
  const [state, setState] = useState<{ user: string; saved: Appearance; draft: Appearance }>({ user: '', saved: appearanceDefaults, draft: appearanceDefaults });
  const [publicMode, setPublicMode] = useState<Theme>(legacyMode);
  const [system, setSystem] = useState(systemTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identity = useRef(user);
  identity.current = user;
  const fallback = useMemo(() => user ? readAppearance(user) : appearanceDefaults, [user]);
  const appearance = state.user === user ? state.draft : fallback;
  const savedAppearance = state.user === user ? state.saved : fallback;
  const theme = internal ? appearance.mode : publicMode;
  const resolvedTheme = theme === 'system' ? system : theme;
  const colors = useMemo(() => internal ? appearanceColors(appearance, resolvedTheme) : defaultThemeColors, [internal, appearance, resolvedTheme]);

  useEffect(() => {
    setError(null);
    setState({ user, saved: fallback, draft: fallback });
  }, [user, fallback]);
  useEffect(() => {
    if (!internal || !query.data?.message) return;
    const value = query.data.message;
    cacheAppearance(user, value);
    setState(previous => ({ user, saved: value, draft: previous.user === user && JSON.stringify(previous.saved) !== JSON.stringify(previous.draft) ? previous.draft : value }));
  }, [user, internal, query.data]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    applyThemeColors(colors, resolvedTheme);
    applyComponentTokens(internal ? appearance : null, resolvedTheme);
    if (internal) {
      root.dataset.internalAppearance = appearance.density;
      root.dataset.internalPalette = appearance.palette;
      root.dataset.internalTextSize = appearance.text_size;
      root.style.setProperty('--internal-font', fontFamilies[appearance.typography]);
    } else {
      delete root.dataset.internalAppearance;
      delete root.dataset.internalPalette;
      delete root.dataset.internalTextSize;
      root.style.removeProperty('--internal-font');
    }
  }, [internal, appearance, colors, resolvedTheme]);

  const previewAppearance = (value: Appearance) => { setError(null); setState({ user, saved: savedAppearance, draft: value }); };
  const cancelAppearance = () => { setError(null); setState({ user, saved: savedAppearance, draft: savedAppearance }); };
  const saveValue = async (next: Appearance) => {
    if (!internal || !session?.authenticated || query.error || query.isLoading || saving) return;
    const savingUser = user;
    setSaving(true); setError(null);
    try {
      const result = await post.call({ preferences: JSON.stringify(next) });
      if (identity.current !== savingUser) return;
      cacheAppearance(user, result.message);
      setState({ user, saved: result.message, draft: result.message });
      await query.mutate(result, false);
    } catch {
      if (identity.current === savingUser) setError('Could not save appearance. Your preview is still available. Retry or Cancel.');
      throw new Error('Appearance save failed');
    } finally { setSaving(false); }
  };
  const value: ThemeProviderState = {
    appearance, savedAppearance, previewAppearance, cancelAppearance, saveAppearance: () => saveValue(appearance), saving,
    appearanceError: error || (internal && query.error ? 'Could not load saved appearance. Retry after reloading.' : null),
    theme, setTheme: (mode: Theme) => {
      if (internal) {
        const next = { ...appearance, mode };
        previewAppearance(next);
        if (pathname !== '/settings/appearance') void saveValue(next).catch(() => undefined);
      }
      else { setPublicMode(mode); try { localStorage.setItem('vite-ui-theme', mode); } catch { /* Optional cache. */ } }
    }, colors, isLoadingColors: internal && (!session?.authenticated || query.isLoading || !!query.error), resolvedTheme,
  };
  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
export type { Theme, ThemeProviderState, ThemeColors };
export { defaultThemeColors, applyThemeColors } from './useThemeColors';
