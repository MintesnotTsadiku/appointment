/**
 * Hook for fetching and managing theme colors from Landing Page Settings
 * 
 * NOTE: This hook uses plain fetch instead of useFrappeGetCall because
 * ThemeProvider is rendered OUTSIDE of FrappeProvider in the component tree.
 */
import { useState, useEffect } from 'react';
import { ThemeColors } from './types';

// Default theme colors - matches the backend defaults
export const defaultThemeColors: ThemeColors = {
  dark: {
    background: {
      primary: "#0a0a0f",
      secondary: "#0f0f17",
      tertiary: "#12121a",
      elevated: "#1a1a24",
    },
    text: {
      primary: "#ffffff",
      secondary: "#d1d5db",
      muted: "#9ca3af",
      subtle: "#6b7280",
    },
    border: {
      subtle: "rgba(255,255,255,0.05)",
      default: "rgba(255,255,255,0.1)",
      strong: "rgba(255,255,255,0.2)",
    },
    glow: {
      primary: "rgba(139,92,246,0.2)",
      secondary: "rgba(59,130,246,0.2)",
      success: "rgba(16,185,129,0.1)",
    },
  },
  light: {
    background: {
      primary: "#ffffff",
      secondary: "#f9fafb",
      tertiary: "#f3f4f6",
      elevated: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#374151",
      muted: "#6b7280",
      subtle: "#9ca3af",
    },
    border: {
      subtle: "#f3f4f6",
      default: "#e5e7eb",
      strong: "#d1d5db",
    },
    shadow: {
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.1)",
      lg: "0 10px 15px rgba(0,0,0,0.1)",
    },
  },
  accent: {
    primary: {
      default: "#8b5cf6",
      hover: "#7c3aed",
      light: "rgba(139,92,246,0.2)",
    },
    secondary: {
      default: "#f97316",
      hover: "#ea580c",
      light: "rgba(249,115,22,0.2)",
    },
    success: {
      default: "#10b981",
      hover: "#059669",
      light: "rgba(16,185,129,0.2)",
    },
    warning: {
      default: "#f59e0b",
      hover: "#d97706",
      light: "rgba(245,158,11,0.2)",
    },
  },
  status: {
    pending: {
      color: "#3b82f6",
      background: "rgba(59,130,246,0.2)",
    },
    confirmed: {
      color: "#10b981",
      background: "rgba(16,185,129,0.2)",
    },
    completed: {
      color: "#6b7280",
      background: "rgba(107,114,128,0.2)",
    },
    cancelled: {
      color: "#ef4444",
      background: "rgba(239,68,68,0.2)",
    },
    no_show: {
      color: "#f59e0b",
      background: "rgba(245,158,11,0.2)",
    },
    in_progress: {
      color: "#8b5cf6",
      background: "rgba(139,92,246,0.2)",
    },
  },
  gradient: {
    primary: {
      from: "#8b5cf6",
      to: "#7c3aed",
    },
    secondary: {
      from: "#f97316",
      to: "#f59e0b",
    },
    success: {
      from: "#10b981",
      to: "#14b8a6",
    },
  },
  brand: {
    primary: "#030303",
    secondary: "#10B981",
    gold: "#F59E0B",
    teal: "#14B8A6",
  },
};

export function useThemeColors() {
  const [colors, setColors] = useState<ThemeColors>(defaultThemeColors);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch theme colors using plain fetch (not useFrappeGetCall)
    // This works outside of FrappeProvider context
    const fetchThemeColors = async () => {
      try {
        setIsLoading(true);
        
        // Build the API URL
        const baseUrl = import.meta.env.VITE_BASE_URL || '';
        const apiUrl = `${baseUrl}/api/method/appointment.scheduler.api.theme.get_theme_colors`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.message) {
          setColors(data.message);
        }
      } catch (err) {
        // Don't crash on error - just use defaults
        console.warn('Failed to fetch theme colors, using defaults:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setColors(defaultThemeColors);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemeColors();
  }, []); // Only fetch once on mount

  return {
    colors,
    isLoading,
    error,
  };
}

/**
 * Generates CSS custom properties from theme colors
 */
export function generateCSSVariables(colors: ThemeColors, mode: 'dark' | 'light'): string {
  const modeColors = colors[mode];
  const { accent, status, gradient, brand } = colors;

  const variables: Record<string, string> = {
    // Background colors
    '--bg-primary': modeColors.background.primary,
    '--bg-secondary': modeColors.background.secondary,
    '--bg-tertiary': modeColors.background.tertiary,
    '--bg-elevated': modeColors.background.elevated,

    // Text colors
    '--text-primary': modeColors.text.primary,
    '--text-secondary': modeColors.text.secondary,
    '--text-muted': modeColors.text.muted,
    '--text-subtle': modeColors.text.subtle,

    // Border colors
    '--border-subtle': modeColors.border.subtle,
    '--border-default': modeColors.border.default,
    '--border-strong': modeColors.border.strong,

    // Accent colors - Primary
    '--accent-primary': accent.primary.default,
    '--accent-primary-hover': accent.primary.hover,
    '--accent-primary-light': accent.primary.light,

    // Accent colors - Secondary (Orange/Amber for walk-ins)
    '--accent-secondary': accent.secondary.default,
    '--accent-secondary-hover': accent.secondary.hover,
    '--accent-secondary-light': accent.secondary.light,

    // Accent colors - Success (Emerald/Teal)
    '--accent-success': accent.success.default,
    '--accent-success-hover': accent.success.hover,
    '--accent-success-light': accent.success.light,

    // Accent colors - Warning (Amber)
    '--accent-warning': accent.warning.default,
    '--accent-warning-hover': accent.warning.hover,
    '--accent-warning-light': accent.warning.light,

    // Status colors
    '--status-pending': status.pending.color,
    '--status-pending-bg': status.pending.background,
    '--status-confirmed': status.confirmed.color,
    '--status-confirmed-bg': status.confirmed.background,
    '--status-completed': status.completed.color,
    '--status-completed-bg': status.completed.background,
    '--status-cancelled': status.cancelled.color,
    '--status-cancelled-bg': status.cancelled.background,
    '--status-no-show': status.no_show.color,
    '--status-no-show-bg': status.no_show.background,
    '--status-in-progress': status.in_progress.color,
    '--status-in-progress-bg': status.in_progress.background,

    // Gradient colors
    '--gradient-primary-from': gradient.primary.from,
    '--gradient-primary-to': gradient.primary.to,
    '--gradient-secondary-from': gradient.secondary.from,
    '--gradient-secondary-to': gradient.secondary.to,
    '--gradient-success-from': gradient.success.from,
    '--gradient-success-to': gradient.success.to,

    // Brand colors
    '--brand-primary': brand.primary,
    '--brand-secondary': brand.secondary,
    '--brand-gold': brand.gold,
    '--brand-teal': brand.teal,
  };

  // Add mode-specific variables
  if (mode === 'dark') {
    const darkColors = colors.dark;
    variables['--glow-primary'] = darkColors.glow.primary;
    variables['--glow-secondary'] = darkColors.glow.secondary;
    variables['--glow-success'] = darkColors.glow.success;
  } else {
    const lightColors = colors.light;
    variables['--shadow-sm'] = lightColors.shadow.sm;
    variables['--shadow-md'] = lightColors.shadow.md;
    variables['--shadow-lg'] = lightColors.shadow.lg;
  }

  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');
}

/**
 * Applies theme colors as CSS variables to the document root
 */
export function applyThemeColors(colors: ThemeColors, mode: 'dark' | 'light'): void {
  const root = document.documentElement;
  const modeColors = colors[mode];
  const { accent, status, gradient, brand } = colors;

  // Background colors
  root.style.setProperty('--bg-primary', modeColors.background.primary);
  root.style.setProperty('--bg-secondary', modeColors.background.secondary);
  root.style.setProperty('--bg-tertiary', modeColors.background.tertiary);
  root.style.setProperty('--bg-elevated', modeColors.background.elevated);

  // Text colors
  root.style.setProperty('--text-primary', modeColors.text.primary);
  root.style.setProperty('--text-secondary', modeColors.text.secondary);
  root.style.setProperty('--text-muted', modeColors.text.muted);
  root.style.setProperty('--text-subtle', modeColors.text.subtle);

  // Border colors
  root.style.setProperty('--border-subtle', modeColors.border.subtle);
  root.style.setProperty('--border-default', modeColors.border.default);
  root.style.setProperty('--border-strong', modeColors.border.strong);

  // Accent colors - Primary (Violet/Purple)
  root.style.setProperty('--accent-primary', accent.primary.default);
  root.style.setProperty('--accent-primary-hover', accent.primary.hover);
  root.style.setProperty('--accent-primary-light', accent.primary.light);

  // Accent colors - Secondary (Orange/Amber)
  root.style.setProperty('--accent-secondary', accent.secondary.default);
  root.style.setProperty('--accent-secondary-hover', accent.secondary.hover);
  root.style.setProperty('--accent-secondary-light', accent.secondary.light);

  // Accent colors - Success (Emerald/Teal)
  root.style.setProperty('--accent-success', accent.success.default);
  root.style.setProperty('--accent-success-hover', accent.success.hover);
  root.style.setProperty('--accent-success-light', accent.success.light);

  // Accent colors - Warning (Amber)
  root.style.setProperty('--accent-warning', accent.warning.default);
  root.style.setProperty('--accent-warning-hover', accent.warning.hover);
  root.style.setProperty('--accent-warning-light', accent.warning.light);

  // Status colors
  root.style.setProperty('--status-pending', status.pending.color);
  root.style.setProperty('--status-pending-bg', status.pending.background);
  root.style.setProperty('--status-confirmed', status.confirmed.color);
  root.style.setProperty('--status-confirmed-bg', status.confirmed.background);
  root.style.setProperty('--status-completed', status.completed.color);
  root.style.setProperty('--status-completed-bg', status.completed.background);
  root.style.setProperty('--status-cancelled', status.cancelled.color);
  root.style.setProperty('--status-cancelled-bg', status.cancelled.background);
  root.style.setProperty('--status-no-show', status.no_show.color);
  root.style.setProperty('--status-no-show-bg', status.no_show.background);
  root.style.setProperty('--status-in-progress', status.in_progress.color);
  root.style.setProperty('--status-in-progress-bg', status.in_progress.background);

  // Gradient colors
  root.style.setProperty('--gradient-primary-from', gradient.primary.from);
  root.style.setProperty('--gradient-primary-to', gradient.primary.to);
  root.style.setProperty('--gradient-secondary-from', gradient.secondary.from);
  root.style.setProperty('--gradient-secondary-to', gradient.secondary.to);
  root.style.setProperty('--gradient-success-from', gradient.success.from);
  root.style.setProperty('--gradient-success-to', gradient.success.to);

  // Brand colors
  root.style.setProperty('--brand-primary', brand.primary);
  root.style.setProperty('--brand-secondary', brand.secondary);
  root.style.setProperty('--brand-gold', brand.gold);
  root.style.setProperty('--brand-teal', brand.teal);

  // Mode-specific variables
  if (mode === 'dark') {
    const darkColors = colors.dark;
    root.style.setProperty('--glow-primary', darkColors.glow.primary);
    root.style.setProperty('--glow-secondary', darkColors.glow.secondary);
    root.style.setProperty('--glow-success', darkColors.glow.success);
  } else {
    const lightColors = colors.light;
    root.style.setProperty('--shadow-sm', lightColors.shadow.sm);
    root.style.setProperty('--shadow-md', lightColors.shadow.md);
    root.style.setProperty('--shadow-lg', lightColors.shadow.lg);
  }
}
