/**
 * Pure helpers for the customer touchpoints (book again, the customer-to-business prompt).
 * No imports, so `tests/growth-touchpoints.test.mjs` can load this file directly.
 */

export const BUSINESS_PROMPT_API = 'appointment.growth.business_prompt';
export const PROMPT_DISMISSED_KEY = 'appointment.growth.businessPromptDismissed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** The manage token at the end of `/<slug>/booking/<token>` or `/schedule/individual/booking/<token>`. */
export function manageTokenFromPath(path?: string | null): string {
  const match = /\/booking\/([^/?#]+)/.exec(path || '');
  return match ? decodeURIComponent(match[1]) : '';
}

/** True when this browser already closed the prompt. Storage can be missing or throw (private mode). */
export function isPromptDismissed(storage?: StorageLike | null): boolean {
  try {
    return storage?.getItem(PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberPromptDismissed(storage?: StorageLike | null): void {
  try {
    storage?.setItem(PROMPT_DISMISSED_KEY, '1');
  } catch {
    // The card stays closed for this visit only.
  }
}

/** The platform sign-up path with `?source=<channel>`; extra values are added only when set. */
export function signupPath(source: string, extra: Record<string, string | null | undefined> = {}): string {
  const params = new URLSearchParams({ source });
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  return `/signup?${params.toString()}`;
}

/** Only same-site paths may be followed from a server answer. */
export function safeLocalPath(path?: string | null): string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '';
}
