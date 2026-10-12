/**
 * External dependencies
 */
import { useEffect, useState } from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Internal dependencies
 */
import { useTheme } from "..";
import { hidesGlobalModeToggle } from "./modeToggleRoutes";

const ModeToggle = () => {
  const { theme, setTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [shouldHide, setShouldHide] = useState(false);

  // Check current path on mount and when URL changes
  useEffect(() => {
    const checkPath = () => {
      setShouldHide(hidesGlobalModeToggle(window.location.pathname));
    };

    // Initial check
    checkPath();
    
    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', checkPath);
    
    // Listen for pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkPath, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkPath, 0);
    };
    
    // Also check periodically (fallback for edge cases)
    const interval = setInterval(checkPath, 500);

    return () => {
      window.removeEventListener('popstate', checkPath);
      clearInterval(interval);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    // Theme defaults to "system"; no forced light/dark override.
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  // Don't render on pages with integrated toggle
  if (shouldHide) {
    return null;
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed bg-background dark:hover:bg-zinc-800 z-50 max-md:top-4 max-md:right-4 top-10 right-5 lg:top-4 lg:right-4 flex gap-2 items-center justify-center rounded-full p-2 lg:px-3 hover:bg-gray-100 focus:outline-hidden overflow-hidden"
      aria-label={`Theme: ${theme}. Switch theme`}
      data-qa="theme-toggle"
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme + "-icon"}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-blue-500 fill-blue-500" />
          ) : theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-500 fill-amber-500" />
          ) : (
            <Monitor className="h-4 w-4 text-slate-500" />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.span
          key={theme + "-text"}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: reducedMotion ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="max-lg:hidden text-sm font-medium text-blue-500 dark:text-amber-500"
        >
          {theme === "light" ? "Dark" : theme === "dark" ? "System" : "Light"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
};

export default ModeToggle;
