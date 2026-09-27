import { defaultThemeColors } from './useThemeColors';
import type { Theme, ThemeColors } from './types';

export type Appearance = {
  version: 1; palette: 'codex' | 'violet' | 'ocean' | 'forest'; mode: Theme;
  typography: 'system' | 'noto' | 'serif'; text_size: 'standard' | 'large'; density: 'comfortable' | 'compact';
};
export const appearanceDefaults: Appearance = { version: 1, palette: 'codex', mode: 'system', typography: 'system', text_size: 'standard', density: 'comfortable' };
export const palettes = [
  { key: 'codex', label: 'Codex', accent: '#181818', hover: '#333333', light: '#eeeeee', canvas: '#ffffff', dark: '#181818' },
  { key: 'violet', label: 'Violet', accent: '#8b5cf6', hover: '#7c3aed', light: 'rgba(139,92,246,.2)', canvas: '#ffffff', dark: '#0a0a0f' },
  { key: 'ocean', label: 'Ocean', accent: '#0369a1', hover: '#075985', light: 'rgba(3,105,161,.15)', canvas: '#f4f9fc', dark: '#08151f' },
  { key: 'forest', label: 'Forest', accent: '#047857', hover: '#065f46', light: 'rgba(4,120,87,.15)', canvas: '#f4faf6', dark: '#0a1812' },
] as const;
export const fontFamilies = {
  system: 'Inter, "Noto Sans Ethiopic", -apple-system, BlinkMacSystemFont, "Segoe UI", "Internal Ethiopic", sans-serif',
  noto: '"Internal Ethiopic", ui-sans-serif, system-ui, sans-serif',
  serif: '"Internal Serif", "Internal Ethiopic", Georgia, serif',
};
export function appearanceColors(value: Appearance, mode: 'light' | 'dark' = 'light'): ThemeColors {
  const palette = palettes.find(row => row.key === value.palette) || palettes[0];
  if (palette.key === 'violet') return defaultThemeColors;
  if (palette.key === 'codex') {
    const accent = mode === 'dark' ? '#3b3b3b' : '#181818';
    const hover = mode === 'dark' ? '#4b4b4b' : '#333333';
    return {
      ...defaultThemeColors,
      light: { ...defaultThemeColors.light,
        background: { primary: '#ffffff', secondary: '#fafafa', tertiary: '#eeeeee', elevated: '#ffffff' },
        text: { primary: '#202020', secondary: '#454545', muted: '#686868', subtle: '#737373' },
        border: { subtle: '#f0f0f0', default: '#e5e5e5', strong: '#d4d4d4' } },
      dark: { ...defaultThemeColors.dark,
        background: { primary: '#181818', secondary: '#1b1b1b', tertiary: '#2f2f2f', elevated: '#242424' },
        text: { primary: '#f5f5f5', secondary: '#d4d4d4', muted: '#a3a3a3', subtle: '#a3a3a3' },
        border: { subtle: '#262626', default: '#333333', strong: '#525252' },
        glow: { primary: 'transparent', secondary: 'transparent', success: 'transparent' } },
      accent: { ...defaultThemeColors.accent, primary: { default: accent, hover, light: mode === 'dark' ? '#2f2f2f' : '#eeeeee' } },
      gradient: { ...defaultThemeColors.gradient, primary: { from: accent, to: accent } },
    };
  }
  return {
    ...defaultThemeColors,
    light: { ...defaultThemeColors.light, text: { ...defaultThemeColors.light.text, subtle: '#64748b' }, background: { primary: palette.canvas, secondary: palette.key === 'ocean' ? '#eaf3f8' : '#eaf4ed', tertiary: palette.key === 'ocean' ? '#deedf5' : '#deeee3', elevated: '#ffffff' } },
    dark: { ...defaultThemeColors.dark, text: { ...defaultThemeColors.dark.text, subtle: '#9ca3af' }, background: { primary: palette.dark, secondary: palette.key === 'ocean' ? '#10212d' : '#12271c', tertiary: palette.key === 'ocean' ? '#162c3a' : '#193324', elevated: palette.key === 'ocean' ? '#1b3444' : '#203d2c' }, glow: { ...defaultThemeColors.dark.glow, primary: palette.light } },
    accent: { ...defaultThemeColors.accent, primary: { default: palette.accent, hover: palette.hover, light: palette.light } },
    gradient: { ...defaultThemeColors.gradient, primary: { from: palette.accent, to: palette.hover } },
  };
}
export function readAppearance(user: string): Appearance {
  try {
    const value = JSON.parse(localStorage.getItem(`appointment:appearance:${user}`) || 'null');
    if (value?.version === 1 && Object.keys(value).length === 6 && palettes.some(row => row.key === value.palette) && ['light','dark','system'].includes(value.mode) && ['system','noto','serif'].includes(value.typography) && ['standard','large'].includes(value.text_size) && ['comfortable','compact'].includes(value.density)) return value;
  } catch { /* Storage is optional; the server remains authoritative. */ }
  return { ...appearanceDefaults };
}
export function cacheAppearance(user: string, value: Appearance) {
  try { localStorage.setItem(`appointment:appearance:${user}`, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ }
}

export function cachedUser(): string {
  try { return decodeURIComponent(document.cookie.split('; ').find(row => row.startsWith('user_id='))?.slice(8) || '').replace(/^"|"$/g, '').replace(/^Guest$/, ''); } catch { return ''; }
}

const componentTokens = ['background','foreground','card','card-foreground','popover','popover-foreground','primary','primary-foreground','secondary','secondary-foreground','muted','muted-foreground','accent','accent-foreground','border','input','ring'];
export function applyComponentTokens(value: Appearance | null, mode: 'light' | 'dark') {
  const root = document.documentElement;
  if (!value || value.palette === 'violet') {
    componentTokens.forEach(key => root.style.removeProperty(`--${key}`));
    return;
  }
  const colors = appearanceColors(value, mode);
  const surface = colors[mode];
  const tokens: Record<string, string> = {
    background: surface.background.primary, foreground: surface.text.primary,
    card: surface.background.elevated, 'card-foreground': surface.text.primary,
    popover: surface.background.elevated, 'popover-foreground': surface.text.primary,
    primary: colors.accent.primary.default, 'primary-foreground': '#ffffff',
    secondary: surface.background.secondary, 'secondary-foreground': surface.text.primary,
    muted: surface.background.tertiary, 'muted-foreground': surface.text.muted,
    accent: surface.background.tertiary, 'accent-foreground': surface.text.primary,
    border: mode === 'dark' ? '#45515f' : '#cbd5e1', input: mode === 'dark' ? '#45515f' : '#cbd5e1',
    ring: value.palette === 'codex' ? mode === 'dark' ? '#d4d4d4' : '#404040' : mode === 'dark' ? value.palette === 'ocean' ? '#7dd3fc' : '#6ee7b7' : colors.accent.primary.default,
  };
  Object.entries(tokens).forEach(([key, color]) => root.style.setProperty(`--${key}`, hexToHsl(color)));
}
function hexToHsl(hex: string): string {
  const [r, g, b] = [1,3,5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const hue = delta === 0 ? 0 : max === r ? ((g-b)/delta + 6) % 6 : max === g ? (b-r)/delta + 2 : (r-g)/delta + 4;
  return `${hue * 60} ${saturation * 100}% ${lightness * 100}%`;
}
