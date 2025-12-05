import { useState, useEffect } from "react";
import { isOfflineMode, canPerformWriteOperation, getConnectionStatus } from "@/lib/pwa";

/**
 * React hook for PWA functionality
 * Provides connection status and offline mode detection
 */
export function usePWA() {
  const [connectionStatus, setConnectionStatus] = useState(getConnectionStatus());

  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(getConnectionStatus());
    };

    // Listen to online/offline events
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    // Check periodically (every 5 seconds)
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      clearInterval(interval);
    };
  }, []);

  return {
    ...connectionStatus,
    isOfflineMode: isOfflineMode(),
    canWrite: canPerformWriteOperation(),
  };
}





