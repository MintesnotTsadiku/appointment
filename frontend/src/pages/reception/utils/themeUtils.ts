/**
 * Theme Utilities for Reception Console
 * 
 * This file provides helper functions and constants for using theme CSS variables
 * in React components. All colors are defined in global.css and fetched from
 * Landing Page Settings via the ThemeProvider.
 */

// Status color mappings using CSS variables
export const statusColors: Record<string, { color: string; bg: string; border: string }> = {
  'Pending': {
    color: 'var(--status-pending)',
    bg: 'var(--status-pending-bg)',
    border: 'color-mix(in srgb, var(--status-pending) 30%, transparent)',
  },
  'Confirmed': {
    color: 'var(--status-confirmed)',
    bg: 'var(--status-confirmed-bg)',
    border: 'color-mix(in srgb, var(--status-confirmed) 30%, transparent)',
  },
  'Completed': {
    color: 'var(--status-completed)',
    bg: 'var(--status-completed-bg)',
    border: 'color-mix(in srgb, var(--status-completed) 30%, transparent)',
  },
  'Cancelled': {
    color: 'var(--status-cancelled)',
    bg: 'var(--status-cancelled-bg)',
    border: 'color-mix(in srgb, var(--status-cancelled) 30%, transparent)',
  },
  'No Show': {
    color: 'var(--status-no-show)',
    bg: 'var(--status-no-show-bg)',
    border: 'color-mix(in srgb, var(--status-no-show) 30%, transparent)',
  },
  'In Progress': {
    color: 'var(--status-in-progress)',
    bg: 'var(--status-in-progress-bg)',
    border: 'color-mix(in srgb, var(--status-in-progress) 30%, transparent)',
  },
};

/**
 * Get CSS variable values for a specific status
 */
export function getStatusColors(status: string) {
  return statusColors[status] || statusColors['Completed'];
}

/**
 * Theme color CSS variable names - use these in inline styles
 */
export const themeVars = {
  // Backgrounds
  bgPrimary: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgTertiary: 'var(--bg-tertiary)',
  bgElevated: 'var(--bg-elevated)',

  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  textSubtle: 'var(--text-subtle)',

  // Borders
  borderSubtle: 'var(--border-subtle)',
  borderDefault: 'var(--border-default)',
  borderStrong: 'var(--border-strong)',

  // Glows (dark mode)
  glowPrimary: 'var(--glow-primary)',
  glowSecondary: 'var(--glow-secondary)',
  glowSuccess: 'var(--glow-success)',

  // Accents - Primary (Violet/Purple)
  accentPrimary: 'var(--accent-primary)',
  accentPrimaryHover: 'var(--accent-primary-hover)',
  accentPrimaryLight: 'var(--accent-primary-light)',

  // Accents - Secondary (Orange/Amber)
  accentSecondary: 'var(--accent-secondary)',
  accentSecondaryHover: 'var(--accent-secondary-hover)',
  accentSecondaryLight: 'var(--accent-secondary-light)',

  // Accents - Success (Emerald/Teal)
  accentSuccess: 'var(--accent-success)',
  accentSuccessHover: 'var(--accent-success-hover)',
  accentSuccessLight: 'var(--accent-success-light)',

  // Accents - Warning (Amber)
  accentWarning: 'var(--accent-warning)',
  accentWarningHover: 'var(--accent-warning-hover)',
  accentWarningLight: 'var(--accent-warning-light)',

  // Gradients
  gradientPrimaryFrom: 'var(--gradient-primary-from)',
  gradientPrimaryTo: 'var(--gradient-primary-to)',
  gradientSecondaryFrom: 'var(--gradient-secondary-from)',
  gradientSecondaryTo: 'var(--gradient-secondary-to)',
  gradientSuccessFrom: 'var(--gradient-success-from)',
  gradientSuccessTo: 'var(--gradient-success-to)',

  // Brand
  brandPrimary: 'var(--brand-primary)',
  brandSecondary: 'var(--brand-secondary)',
  brandGold: 'var(--brand-gold)',
  brandTeal: 'var(--brand-teal)',
};

/**
 * Generate inline style object for a gradient background
 */
export function gradientStyle(type: 'primary' | 'secondary' | 'success', direction = 'to right') {
  const gradients = {
    primary: `linear-gradient(${direction}, var(--gradient-primary-from), var(--gradient-primary-to))`,
    secondary: `linear-gradient(${direction}, var(--gradient-secondary-from), var(--gradient-secondary-to))`,
    success: `linear-gradient(${direction}, var(--gradient-success-from), var(--gradient-success-to))`,
  };
  return { background: gradients[type] };
}

/**
 * Generate inline style for card-like elements
 */
export function cardStyle(variant: 'default' | 'elevated' | 'ghost' = 'default') {
  const styles = {
    default: {
      backgroundColor: 'var(--border-subtle)',
      border: '1px solid var(--border-default)',
    },
    elevated: {
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1))',
    },
    ghost: {
      backgroundColor: 'transparent',
      border: '1px solid var(--border-subtle)',
    },
  };
  return styles[variant];
}

/**
 * Generate inline style for buttons
 */
export function buttonStyle(variant: 'primary' | 'secondary' | 'success' | 'ghost' = 'primary') {
  const styles = {
    primary: {
      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
      color: 'white',
    },
    secondary: {
      background: 'linear-gradient(to right, var(--gradient-secondary-from), var(--gradient-secondary-to))',
      color: 'white',
    },
    success: {
      background: 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))',
      color: 'white',
    },
    ghost: {
      backgroundColor: 'var(--border-subtle)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-primary)',
    },
  };
  return styles[variant];
}

/**
 * Status badge component helper
 */
export function statusBadgeStyle(status: string) {
  const colors = getStatusColors(status);
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
  };
}






