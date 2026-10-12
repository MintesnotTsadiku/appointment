/**
 * Sign-out steps without React, so the order can be tested.
 * The SDK `logout()` revalidates `frappe.auth.get_logged_user` after the session ends, which the
 * server answers with 403 for Guest. This sends only the logout call and then leaves with a full
 * page load, which drops every in-memory cache of the old session.
 */
export const SIGN_IN_PATH = '/login';

export type SignOutSteps = {
  /** POST /api/method/logout. */
  endSession: () => Promise<unknown>;
  /** Remove browser data that belongs to the signed-in user. */
  clearCaches: () => void;
  /** Leave the page (window.location.replace). */
  leave: (path: string) => void;
  onError?: (error: unknown) => void;
};

export async function runSignOut({ endSession, clearCaches, leave, onError }: SignOutSteps): Promise<void> {
  try {
    await endSession();
  } catch (error) {
    onError?.(error);
  }
  try {
    clearCaches();
  } catch (error) {
    onError?.(error);
  }
  leave(SIGN_IN_PATH);
}
