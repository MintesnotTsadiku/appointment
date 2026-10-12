import { sourceFromSearch, viewLogUrl } from './referral-source-core';

const KEY = 'appointment:referral-source';

/**
 * Remember `?source=` for this browser session and log one page view for it, so a booking made
 * after the visitor moves from the landing page to the scheduler still records the channel.
 */
export function captureReferralSource(): void {
  if (typeof window === 'undefined') return;
  const source = sourceFromSearch(window.location.search);
  if (!source) return;
  try {
    window.sessionStorage.setItem(KEY, source);
  } catch {
    /* Storage is optional. */
  }
  // Frappe only stores the view when website view tracking is on; failures never affect the page.
  // Read the body: an unread response body keeps the request open, so the page never goes network-idle.
  fetch(viewLogUrl(source, document.referrer), { credentials: 'same-origin' })
    .then((response) => response.text())
    .catch(() => undefined);
}

/** The source captured in this session, else from the current URL. */
export function referralSource(): string {
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    /* Storage is optional. */
  }
  return sourceFromSearch(window.location.search) || '';
}
