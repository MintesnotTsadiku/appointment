/**
 * PWA Utility Functions
 * 
 * Handles offline detection and write operation blocking
 * CRITICAL FIX #1: Prevents write operations when offline (stale CSRF token)
 */

/**
 * Check if the app is in offline mode
 * This happens when:
 * 1. User is actually offline (no network)
 * 2. App loaded from cached HTML with stale CSRF token
 */
export function isOfflineMode(): boolean {
  // Check if explicitly set by service worker or connection status
  if (typeof window !== "undefined" && (window as any).__PWA_OFFLINE__) {
    return true;
  }
  
  // Check actual network status
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  
  // Check if CSRF token is missing (indicates cached HTML)
  if (typeof window !== "undefined" && window.frappe) {
    if (!window.frappe.csrf_token || window.frappe.csrf_token === "") {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if write operations are allowed
 * Write operations (POST/PUT/DELETE) require a fresh CSRF token
 */
export function canPerformWriteOperation(): boolean {
  return !isOfflineMode();
}

/**
 * Show error message when write operation is attempted offline
 */
export function showOfflineWriteError(): void {
  // You can customize this to use your toast/notification system
  const message = "You're offline or using a cached version. Write operations are disabled. Please refresh the page when online.";
  
  // Try to use frappe's toast if available
  if (typeof window !== "undefined" && (window as any).frappe?.show_alert) {
    (window as any).frappe.show_alert({
      message: message,
      indicator: "red",
    });
  } else {
    // Fallback to browser alert
    alert(message);
  }
}

/**
 * Wrapper for API calls that blocks write operations when offline
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  isWriteOperation: boolean = false
): Promise<T> {
  if (isWriteOperation && !canPerformWriteOperation()) {
    showOfflineWriteError();
    throw new Error("Write operations are disabled in offline mode");
  }
  
  return apiCall();
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
  isOnline: boolean;
  isOfflineMode: boolean;
  canWrite: boolean;
} {
  return {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isOfflineMode: isOfflineMode(),
    canWrite: canPerformWriteOperation(),
  };
}

/**
 * Offline Action Queue
 * CRITICAL FIX #5A: Queue actions for batch sync when back online
 */

interface QueuedAction {
  id: string;
  type: "book" | "cancel" | "reschedule" | "update_profile";
  data: Record<string, any>;
  timestamp: string;
}

const QUEUE_STORAGE_KEY = "pwa_offline_queue";

/**
 * Queue an action for sync when back online
 */
export function queueOfflineAction(
  type: QueuedAction["type"],
  data: Record<string, any>
): string {
  const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const action: QueuedAction = {
    id: actionId,
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  
  // Get existing queue
  const queue = getOfflineQueue();
  queue.push(action);
  
  // Save to localStorage
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save offline queue:", e);
  }
  
  return actionId;
}

/**
 * Get all queued actions
 */
export function getOfflineQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as QueuedAction[];
  } catch (e) {
    console.error("Failed to read offline queue:", e);
    return [];
  }
}

/**
 * Clear the offline queue
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear offline queue:", e);
  }
}

/**
 * Sync queued actions to server
 * CRITICAL FIX #5A: Batch sync for transactional integrity
 */
export async function syncOfflineQueue(): Promise<{
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}> {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return {
      success: true,
      results: [],
      summary: {
        total: 0,
        succeeded: 0,
        failed: 0,
      },
    };
  }
  
  // Check if we're online
  if (!navigator.onLine || isOfflineMode()) {
    throw new Error("Cannot sync while offline");
  }
  
  try {
    // Call batch sync endpoint
    const response = await fetch("/api/method/appointment.api.offline.sync_queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": window.frappe?.csrf_token || "",
      },
      body: JSON.stringify({
        actions: queue,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Clear successfully synced actions
    if (result.success) {
      const failedIds = new Set(
        result.results
          .filter((r: any) => !r.success)
          .map((r: any) => r.id)
      );
      
      // Keep only failed actions in queue
      const remainingQueue = queue.filter((action) => failedIds.has(action.id));
      
      if (remainingQueue.length === 0) {
        clearOfflineQueue();
      } else {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
      }
    }
    
    return result;
  } catch (error) {
    console.error("Failed to sync offline queue:", error);
    throw error;
  }
}

/**
 * Auto-sync when back online
 */
export function setupAutoSync(): void {
  if (typeof window === "undefined") return;
  
  const handleOnline = async () => {
    // Wait a bit for connection to stabilize
    setTimeout(async () => {
      const queue = getOfflineQueue();
      if (queue.length > 0 && !isOfflineMode()) {
        try {
          await syncOfflineQueue();
          console.log("Offline queue synced successfully");
        } catch (error) {
          console.error("Failed to auto-sync offline queue:", error);
        }
      }
    }, 2000);
  };
  
  window.addEventListener("online", handleOnline);
}

