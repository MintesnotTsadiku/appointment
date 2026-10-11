/**
 * Where a visitor came from, read from `?source=` (or `utm_source`) on the first page they open.
 * Pure helpers; `referral-source.ts` keeps the value for the browser session.
 */
const SOURCE = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export function sourceFromSearch(search: string): string | null {
  const params = new URLSearchParams(search || '');
  const value = (params.get('source') || params.get('utm_source') || '').trim().toLowerCase();
  return SOURCE.test(value) ? value : null;
}

/** The Frappe page-view log call for a visit with a source (counts visits per share channel). */
export function viewLogUrl(source: string, referrer: string): string {
  const params = new URLSearchParams({ source, referrer: (referrer || '').split('?')[0] });
  return `/api/method/frappe.website.doctype.web_page_view.web_page_view.make_view_log?${params}`;
}
