/**
 * External dependencies
 */
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Internal dependencies
 */
import { useTheme } from "..";

// Routes that have their own integrated theme toggle
const ROUTES_WITH_INTEGRATED_TOGGLE = ['/reception'];

const ModeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [shouldHide, setShouldHide] = useState(false);

  // Check current path on mount and when URL changes
  useEffect(() => {
    const checkPath = () => {
      const currentPath = window.location.pathname;
      const hide = ROUTES_WITH_INTEGRATED_TOGGLE.some(
        route => currentPath.startsWith(route)
      );
      setShouldHide(hide);
    };

    checkPath();
    
    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', checkPath);
    
    // Create a MutationObserver to detect SPA route changes
    const observer = new MutationObserver(checkPath);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('popstate', checkPath);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!theme) {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(systemPrefersDark ? "dark" : "light");
    }
  }, [theme, setTheme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Don't render on pages with integrated toggle
  if (shouldHide) {
    return null;
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed bg-background dark:hover:bg-zinc-800 z-50 max-md:top-4 max-md:right-4 top-10 right-5 lg:top-4 lg:right-4 flex gap-2 items-center justify-center rounded-full p-2 lg:px-3 hover:bg-gray-100 focus:outline-none overflow-hidden"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme + "-icon"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-blue-500 fill-blue-500" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500 fill-amber-500" />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.span
          key={theme + "-text"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="max-lg:hidden text-sm font-medium text-blue-500 dark:text-amber-500"
        >
          {theme === "light" ? "Dark" : "Light"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
};

export default ModeToggle;
