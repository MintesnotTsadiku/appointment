/**
 * Theme Provider - Manages theme state and CSS custom properties
 * 
 * This provider:
 * 1. Handles light/dark/system theme switching
 * 2. Applies the platform-owned color system as CSS custom properties
 */
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { Theme, ThemeProviderState, ThemeColors } from "./types"
import { applyThemeColors, defaultThemeColors } from "./useThemeColors"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  colors: defaultThemeColors,
  isLoadingColors: false,
  resolvedTheme: "light",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  // Resolve the first paint from the actual preference to avoid a flash.
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() =>
    theme === "system" ? systemTheme() : (theme as "dark" | "light")
  )
  
  const safeColors = defaultThemeColors

  // Resolve the actual theme (handle system preference)
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    let actualTheme: "dark" | "light"

    if (theme === "system") {
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    } else {
      actualTheme = theme
    }

    root.classList.add(actualTheme)
    root.style.colorScheme = actualTheme
    setResolvedTheme(actualTheme)
  }, [theme])

  // Apply theme colors when they change or theme mode changes
  useEffect(() => {
    if (safeColors) {
      applyThemeColors(safeColors, resolvedTheme)
    }
  }, [safeColors, resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light"
      setResolvedTheme(newTheme)
      
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(newTheme)
      root.style.colorScheme = newTheme
      
      if (safeColors) {
        applyThemeColors(safeColors, newTheme)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, safeColors])

  const value = useMemo(() => ({
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
    colors: safeColors,
    isLoadingColors: false,
    resolvedTheme,
  }), [theme, safeColors, resolvedTheme, storageKey])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

// Re-export types and utilities
export type { Theme, ThemeProviderState, ThemeColors }
export { defaultThemeColors, applyThemeColors } from "./useThemeColors"
