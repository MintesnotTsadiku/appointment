/**
 * Theme Provider - Manages theme state and CSS custom properties
 * 
 * This provider:
 * 1. Handles light/dark/system theme switching
 * 2. Fetches theme colors from Landing Page Settings
 * 3. Applies colors as CSS custom properties
 */
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { Theme, ThemeProviderState, ThemeColors } from "./types"
import { useThemeColors, applyThemeColors, defaultThemeColors } from "./useThemeColors"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  colors: null,
  isLoadingColors: true,
  resolvedTheme: "dark",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "frappe-appointment-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")
  
  // Fetch theme colors from backend - gracefully handle errors
  const { colors, isLoading: isLoadingColors } = useThemeColors()
  
  // Ensure colors is never null - use defaults if needed
  const safeColors = colors || defaultThemeColors

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
    isLoadingColors,
    resolvedTheme,
  }), [theme, safeColors, isLoadingColors, resolvedTheme, storageKey])

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
