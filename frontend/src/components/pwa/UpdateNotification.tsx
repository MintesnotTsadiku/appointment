import { RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateNotification() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered:", r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    // CRITICAL FIX #5B: Safe update UX - confirm before reloading
    if (window.confirm("New version available. Reload now? (Any unsaved changes will be lost)")) {
      updateServiceWorker(true);
    }
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-indigo-600 text-white rounded-lg shadow-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <div>
            {offlineReady ? (
              <p className="font-medium">App ready to work offline</p>
            ) : (
              <p className="font-medium">New version available!</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={handleUpdate}
              className="px-4 py-1.5 bg-white text-indigo-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Update
            </button>
          )}
          <button
            onClick={close}
            className="px-4 py-1.5 bg-indigo-700 rounded-md hover:bg-indigo-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}





