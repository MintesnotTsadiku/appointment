import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Show again after 7 days
    if (dismissedDate && daysSinceDismissed < 7) {
      setHasBeenDismissed(true);
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds or 2nd visit
      const visitCount = parseInt(localStorage.getItem("visit-count") || "0");
      if (visitCount >= 1 && !hasBeenDismissed) {
        setTimeout(() => setShowPrompt(true), 30000); // 30 seconds
      }

      localStorage.setItem("visit-count", String(visitCount + 1));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [hasBeenDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA installed successfully");
      // Track analytics
      trackInstallEvent("accepted");
    } else {
      console.log("PWA installation dismissed");
      trackInstallEvent("dismissed");
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
    trackInstallEvent("dismissed");
  };

  const trackInstallEvent = (action: string) => {
    // Track with your analytics tool
    if (window.frappe?.call) {
      window.frappe.call({
        method: "appointment.api.analytics.track_pwa_event",
        args: {
          event: "pwa_install_prompt",
          action: action,
          platform: isIOS ? "ios" : "android",
        },
      }).catch(() => {
        // Silently fail if analytics endpoint doesn't exist yet
      });
    }
  };

  // Don't show if already installed or on iOS (iOS doesn't support beforeinstallprompt)
  if (isStandalone || hasBeenDismissed) return null;

  // iOS-specific instructions
  if (isIOS && !isStandalone && !hasBeenDismissed) {
    return (
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Install App
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add to Home Screen
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-900 dark:text-white">
                  To install this app on your iPhone:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Tap the <span className="font-semibold">Share</span> button below
                  </li>
                  <li>
                    Scroll down and tap{" "}
                    <span className="font-semibold">"Add to Home Screen"</span>
                  </li>
                  <li>
                    Tap <span className="font-semibold">"Add"</span> to confirm
                  </li>
                </ol>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  💡 Works offline · Faster loading · Native app feel
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Android/Desktop prompt
  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Install Ethiopian Scheduler
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    መርሃግብር - ኢትዮጵያ
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Install this app for a better experience. Works offline, loads faster, and
              feels like a native app.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div>
                <div className="text-2xl mb-1">📱</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">App-like</p>
              </div>
              <div>
                <div className="text-2xl mb-1">⚡</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Fast</p>
              </div>
              <div>
                <div className="text-2xl mb-1">📡</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Offline</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                Install
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

