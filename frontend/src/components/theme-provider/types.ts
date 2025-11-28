export type Theme = "dark" | "light" | "system"

export interface ThemeColors {
  dark: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      subtle: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
    };
    glow: {
      primary: string;
      secondary: string;
      success: string;
    };
  };
  light: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      subtle: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
    };
    shadow: {
      sm: string;
      md: string;
      lg: string;
    };
  };
  accent: {
    primary: {
      default: string;
      hover: string;
      light: string;
    };
    secondary: {
      default: string;
      hover: string;
      light: string;
    };
    success: {
      default: string;
      hover: string;
      light: string;
    };
    warning: {
      default: string;
      hover: string;
      light: string;
    };
  };
  status: {
    pending: { color: string; background: string };
    confirmed: { color: string; background: string };
    completed: { color: string; background: string };
    cancelled: { color: string; background: string };
    no_show: { color: string; background: string };
    in_progress: { color: string; background: string };
  };
  gradient: {
    primary: { from: string; to: string };
    secondary: { from: string; to: string };
    success: { from: string; to: string };
  };
  brand: {
    primary: string;
    secondary: string;
    gold: string;
    teal: string;
  };
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  colors: ThemeColors | null
  isLoadingColors: boolean
  resolvedTheme: "dark" | "light"
}
