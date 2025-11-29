import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { syncOfflineQueue, setupAutoSync } from "@/lib/pwa";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  useEffect(() => {
    // Setup auto-sync when back online
    setupAutoSync();
    
    const handleOnline = async () => {
      setIsOnline(true);
      setShowOfflineWarning(false);
      window.__PWA_OFFLINE__ = false;
      
      // CRITICAL FIX #5A: Auto-sync queued actions when back online
      try {
        await syncOfflineQueue();
      } catch (error) {
        console.error("Failed to sync offline queue:", error);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineWarning(true);
      
      // Set offline flag for React app to disable write operations
      // CRITICAL FIX #1: Disable write operations when offline (stale CSRF token)
      window.__PWA_OFFLINE__ = true;
    };

    // Check if we're in offline mode (from cached HTML with stale token)
    if (window.__PWA_OFFLINE__) {
      setShowOfflineWarning(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Clear offline flag when back online
  useEffect(() => {
    if (isOnline) {
      window.__PWA_OFFLINE__ = false;
    }
  }, [isOnline]);

  if (isOnline && !showOfflineWarning) return null;

  return (
    <AnimatePresence>
      {showOfflineWarning && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 bg-yellow-500 dark:bg-yellow-600 text-white text-center py-2 z-50 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <p className="text-sm font-medium">
                  Back online! Syncing your data...
                </p>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <p className="text-sm font-medium">
                  📡 You're offline - Some features may be limited. Write operations disabled.
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

