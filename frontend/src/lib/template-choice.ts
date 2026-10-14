/**
 * The website template chosen in the landing gallery ("Use this template"), carried from sign-up to
 * the first website setup. The server keeps it with the sign-up (`appointment.growth.template_choice`);
 * these helpers read it from a URL and build the next links. No imports, so
 * `tests/template-choice.test.mjs` can load this file directly.
 */

export const TEMPLATE_CHOICE_API = 'appointment.growth.template_choice';
export const GALLERY_SOURCE = 'template_gallery';

const KEY = /^[a-z][a-z0-9-]{1,60}$/;

/** A recipe key as the gallery sends it, or ''. The server checks it against the certified recipes. */
export function cleanTemplate(value?: string | null): string {
  const key = (value || '').trim().toLowerCase();
  return KEY.test(key) ? key : '';
}

/** `?template=` from a query string. */
export function templateFromSearch(search: string): string {
  return cleanTemplate(new URLSearchParams(search).get('template'));
}

/** The gallery choice that applies: the link's template first, then the one kept with the sign-up, and only a known one. */
export function pickGalleryTemplate(fromLink: string, stored: string | null | undefined, known: string[]): string {
  const candidates = [cleanTemplate(fromLink), cleanTemplate(stored)];
  return candidates.find((key) => key && known.includes(key)) || '';
}

/** Website setup with the template choice, as the gallery links to it. */
export function websiteSetupPath(template: string): string {
  const key = cleanTemplate(template);
  if (!key) return '/settings/website';
  return `/settings/website?${new URLSearchParams({ source: GALLERY_SOURCE, template: key })}`;
}

/** Sign-in from sign-up keeps the choice: an existing owner lands on website setup with it. */
export function signInPath(template: string): string {
  const key = cleanTemplate(template);
  return key ? `/login?${new URLSearchParams({ 'redirect-to': websiteSetupPath(key) })}` : '/login';
}

/** The query without the gallery parameters, once the choice is used or dismissed. */
export function withoutTemplate(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('template');
  if (params.get('source') === GALLERY_SOURCE) params.delete('source');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/** The chosen template first, the ranking order otherwise kept. */
export function choiceFirst<T extends { key: string }>(rows: T[], key: string): T[] {
  const chosen = rows.find((row) => row.key === key);
  return chosen ? [chosen, ...rows.filter((row) => row !== chosen)] : rows;
}

/** A website address from the business name: lower-case Latin letters, digits and hyphens. */
export function addressFromName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}
