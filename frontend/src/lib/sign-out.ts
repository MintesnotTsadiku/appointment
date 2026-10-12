import { useCallback, useContext } from 'react';
import { FrappeContext } from 'frappe-react-sdk';
import { clearOfflineQueue } from './pwa';
import { runSignOut } from './sign-out-core';

/** The one sign-out action for the app: end the session, clear user caches, open the sign-in page. */
export function useSignOut(): () => Promise<void> {
  const frappe = useContext(FrappeContext);
  return useCallback(
    () =>
      runSignOut({
        endSession: () => (frappe ? frappe.auth.logout() : Promise.resolve()),
        clearCaches: clearOfflineQueue,
        leave: (path) => window.location.replace(path),
        onError: (error) => console.error('Sign-out failed:', error),
      }),
    [frappe]
  );
}
