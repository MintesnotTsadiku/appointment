/**
 * Pure helpers for the "your booking page is live" screen. No imports, so the unit test
 * (`frontend/tests/live-page-success.test.mjs`) can load this file on its own.
 */

/** What setup or publish returned about the business page. */
export interface LivePage {
  businessName: string;
  /** The business page path (`sharing.public_path`): its website, else its booking page. Empty when none yet. */
  path: string;
  /** True when customers can book on the page now. */
  published: boolean;
}

export type LiveState = 'published' | 'draft' | 'no-page';

export function liveState(page: Pick<LivePage, 'path' | 'published'>): LiveState {
  if (!page.path) return 'no-page';
  return page.published ? 'published' : 'draft';
}

/**
 * The link as people read it aloud: `<short_host>/path`, without the scheme. A provider page
 * `/schedule/p/<slug>` reads as `<short_host>/<slug>`, which redirects to it.
 */
export function shortLink(shortHost: string, path: string): string {
  const host = (shortHost || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const page = /^\/?schedule\/p\/([^/?#]+)\/?$/.exec(path);
  if (page) return `${host}/${page[1]}`;
  return `${host}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The full URL on this origin. */
export function fullLink(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
