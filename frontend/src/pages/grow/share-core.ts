/**
 * Pure helpers for the Grow page: share messages, share URLs and short-link input.
 * Tested by `frontend/tests/growth-sharing.test.mjs`.
 */

export type ShareSource = 'telegram_share' | 'whatsapp_share' | 'web_share' | 'copy_link' | 'qr_poster';

const PLACEHOLDER = /\{(business|link)\}/g;

/**
 * Fill `{business}` and `{link}` in one pass, so a business name that contains `{link}` stays as typed.
 * A template without `{link}` gets the link at the end.
 */
export function fillMessage(template: string, business: string, link: string): string {
  const base = template && template.includes('{link}') ? template : `${template || '{business}'} {link}`.trim();
  return base.replace(PLACEHOLDER, (_match, key: string) => (key === 'business' ? business : link));
}

/** Replace the link in an edited message when the owner switches channel (each channel has its own `?source=`). */
export function swapLink(message: string, from: string, to: string): string {
  if (!from || from === to || !message.includes(from)) return message;
  return message.split(from).join(to);
}

/** Telegram's share sheet. The text must not repeat the URL, or Telegram shows it twice. */
export function telegramShareUrl(link: string, message: string): string {
  const text = message.split(link).join('').replace(/[ \t]+$/gm, '').replace(/[:፦\s]+$/u, '').trim();
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** The link with `?source=<source>` set, keeping any other query values. */
export function withSource(url: string, source: ShareSource): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('source', source);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** What the owner types into the short-link box, as the server will normalize it. */
export function normalizeSlug(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SlugRules {
  min: number;
  max: number;
}

/** A quick local check before asking the server: 'length' | 'format' | null. */
export function localSlugProblem(slug: string, rules: SlugRules): 'length' | 'format' | null {
  if (slug.length < rules.min || slug.length > rules.max) return 'length';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'format';
  return null;
}
