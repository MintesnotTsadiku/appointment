/**
 * Pure brand helpers shared by `platform-brand.tsx` and its unit test. No imports, so
 * `tests/platform-brand.test.mjs` can load this file directly.
 */

export const PUBLIC_BRAND_API = '/api/method/appointment.growth.api.public_brand';

export interface PlatformGrowth {
  poweredByPages: boolean;
  ownPageText: string;
  bookAgainEnabled: boolean;
  customerBusinessPromptEnabled: boolean;
  shareMessage: string;
  postersEnabled: boolean;
  businessReferralsEnabled: boolean;
  customerReferralsEnabled: boolean;
  partnerProgramEnabled: boolean;
  toolsEnabled: boolean;
  directoryEnabled: boolean;
  /** The directory is on and lists at least one business. */
  directoryPublic: boolean;
  yearReviewEnabled: boolean;
  templateCreditEnabled: boolean;
  marketingLiveMinutes: number;
}

export interface PlatformBrand {
  productName: string;
  productUrl: string;
  shortHost: string;
  logo: string;
  logoDark: string;
  mark: string;
  primaryColor: string;
  tagline: string;
  supportEmail: string;
  telegramUrl: string;
  ogImage: string;
  growth: PlatformGrowth;
  /** False until server values (boot or API) are known. */
  loaded: boolean;
}

/** Server payload shape (snake_case, both languages for texts). */
export interface PublicBrandPayload {
  brand: Record<string, string>;
  growth: Record<string, string | number | boolean>;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const flag = (value: unknown, fallback = true) => (typeof value === 'boolean' ? value : value == null ? fallback : Boolean(Number(value)));

/** The `<field>_am` text for Amharic, else English; empty Amharic falls back to English. */
export function localText(values: Record<string, unknown>, field: string, language: string): string {
  const english = text(values[`${field}_en`]) || text(values[field]);
  return language.startsWith('am') ? text(values[`${field}_am`]) || english : english;
}

function currentHost(): string {
  if (typeof window === 'undefined') return '';
  return window.location.host.replace(/^www\./, '');
}

/** Turn the server payload into the hook shape for one language. Pure; tested in platform-brand.test.mjs. */
export function toPlatformBrand(payload: PublicBrandPayload | null, language: string, host = currentHost()): PlatformBrand {
  const b = payload?.brand ?? {};
  const g = payload?.growth ?? {};
  const productUrl = text(b.product_url) || (typeof window !== 'undefined' ? window.location.origin : '');
  const shortHost = text(b.short_host) || host;
  return {
    productName: text(b.product_name) || shortHost,
    productUrl,
    shortHost,
    logo: text(b.logo),
    logoDark: text(b.logo_dark) || text(b.logo),
    mark: text(b.mark),
    primaryColor: text(b.primary_color),
    tagline: localText(b, 'tagline', language),
    supportEmail: text(b.support_email),
    telegramUrl: text(b.telegram_url),
    ogImage: text(b.og_image),
    growth: {
      poweredByPages: flag(g.powered_by_pages),
      ownPageText: localText(g, 'own_page_text', language),
      bookAgainEnabled: flag(g.book_again_enabled),
      customerBusinessPromptEnabled: flag(g.customer_business_prompt_enabled),
      shareMessage: localText(g, 'share_message', language),
      postersEnabled: flag(g.posters_enabled),
      businessReferralsEnabled: flag(g.business_referrals_enabled),
      customerReferralsEnabled: flag(g.customer_referrals_enabled),
      partnerProgramEnabled: flag(g.partner_program_enabled),
      toolsEnabled: flag(g.tools_enabled),
      directoryEnabled: flag(g.directory_enabled),
      directoryPublic: flag(g.directory_public, false),
      yearReviewEnabled: flag(g.year_review_enabled),
      templateCreditEnabled: flag(g.template_credit_enabled),
      marketingLiveMinutes: Number(g.marketing_live_minutes) || 5,
    },
    loaded: Boolean(payload),
  };
}

/** Replace `{product}` and `{host}` in a catalog string with the platform brand. */
export function withBrand(value: string, brand: Pick<PlatformBrand, 'productName' | 'shortHost'>): string {
  return value.split('{product}').join(brand.productName).split('{host}').join(brand.shortHost);
}

/** Fill `{business}` and `{link}` in the share message. */
export function shareText(template: string, business: string, link: string): string {
  const base = template.includes('{link}') ? template : `${template} {link}`.trim();
  return base.split('{business}').join(business).split('{link}').join(link);
}
