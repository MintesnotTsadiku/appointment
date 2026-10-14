/**
 * Pure helpers for the referral loop: sign-up `?ref`/`?source`, the customer share code
 * kept while a friend books, and reward wording. No imports, so
 * `tests/referral-link.test.mjs` can load this file directly.
 */

export const REFERRALS_API = 'appointment.growth.referrals';
export const CUSTOMER_REFERRALS_API = 'appointment.growth.customer_referral_api';
export const REFERRAL_ADMIN_API = 'appointment.growth.referral_admin';
export const PARTNERS_API = 'appointment.growth.partners';
export const CUSTOMER_REF_KEY = 'appointment.growth.customerRef';
export const CUSTOMER_REFERRAL_SOURCE = 'customer_referral';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** A code as the server stores it: letters and digits, upper case, 4–20 characters. */
export function cleanCode(value?: string | null): string {
  const code = (value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return /^[A-Z0-9]{4,20}$/.test(code) ? code : '';
}

/** A sign-up channel such as `telegram_share` or `tool_time-converter`. */
export function cleanSource(value?: string | null): string {
  const source = (value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(source) ? source : '';
}

/** `ref` and `source` from a sign-up URL query. */
export function signupParams(search: string): { ref: string; source: string } {
  const params = new URLSearchParams(search);
  return { ref: cleanCode(params.get('ref')), source: cleanSource(params.get('source')) };
}

/**
 * The business a scheduler path belongs to, so a friend's code is only sent to that business:
 * `org:<slug>` for `/schedule/org/<slug>/…`, `pro:<slug>` for a provider page `/schedule/p/<slug>/…`,
 * `ind:<offering>` for `/schedule/individual/<offering>`.
 */
export function referralScope(pathname: string): string {
  const org = /^\/schedule\/org\/([^/?#]+)/.exec(pathname);
  if (org) return `org:${org[1]}`;
  const page = /^\/schedule\/p\/([^/?#]+)/.exec(pathname);
  if (page) return `pro:${page[1]}`;
  const solo = /^\/schedule\/individual\/([^/?#]+)/.exec(pathname);
  return solo && solo[1] !== 'booking' ? `ind:${solo[1]}` : '';
}

/** Keep `?ref=` from a share link for the rest of this visit. Storage can be missing or throw. */
export function captureCustomerRef(search: string, pathname: string, storage?: StorageLike | null): string {
  const code = cleanCode(new URLSearchParams(search).get('ref'));
  const scope = referralScope(pathname);
  if (code && scope) {
    try {
      storage?.setItem(CUSTOMER_REF_KEY, JSON.stringify({ code, scope }));
    } catch {
      // The code still works while the query stays in the address bar.
    }
  }
  return code;
}

/** The friend's code for a booking on this path: the query first, then the code kept for the same business. */
export function customerRefFor(search: string, pathname: string, storage?: StorageLike | null): string {
  const fromQuery = cleanCode(new URLSearchParams(search).get('ref'));
  if (fromQuery) return fromQuery;
  const scope = referralScope(pathname);
  try {
    const stored = JSON.parse(storage?.getItem(CUSTOMER_REF_KEY) || 'null') as { code?: string; scope?: string } | null;
    return stored && scope && stored.scope === scope ? cleanCode(stored.code) : '';
  } catch {
    return '';
  }
}

export interface OfferTerms {
  reward_type: 'Percent' | 'Custom';
  percent: number;
  reward_text: string;
}

/** A stored voucher label is `10%` for a percent offer, or the owner's own words. */
export function percentFromLabel(label?: string | null): number | null {
  const match = /^(\d{1,3})%$/.exec((label || '').trim());
  return match ? Number(match[1]) : null;
}

/** Telegram's share sheet; the text must not repeat the URL. */
export function telegramShare(link: string, text: string): string {
  const clean = text.split(link).join('').trim();
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(clean)}`;
}

/** Bookings so far against the threshold, as a whole percent for a progress bar. */
export function progressPercent(bookings: number, threshold: number): number {
  if (!threshold || threshold <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((bookings / threshold) * 100)));
}
