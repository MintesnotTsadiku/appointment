export const API = 'appointment.growth.api';

export interface BrandValues {
  product_name: string;
  product_url: string;
  short_host: string;
  logo: string;
  logo_dark: string;
  mark: string;
  primary_color: string;
  tagline_en: string;
  tagline_am: string;
  support_email: string;
  telegram_url: string;
  og_image: string;
}

export interface GrowthValues {
  powered_by_pages: number;
  powered_by_emails: number;
  powered_by_sms: number;
  own_page_text_en: string;
  own_page_text_am: string;
  book_again_enabled: number;
  customer_business_prompt_enabled: number;
  share_message_en: string;
  share_message_am: string;
  posters_enabled: number;
  business_referrals_enabled: number;
  referral_threshold_bookings: number;
  referral_reward_free_bookings: number;
  customer_referrals_enabled: number;
  customer_referral_default_percent: number;
  partner_program_enabled: number;
  partner_reward_free_bookings: number;
  tools_enabled: number;
  directory_enabled: number;
  year_review_enabled: number;
  template_credit_enabled: number;
  marketing_live_minutes: number;
}

export interface Settings {
  brand: BrandValues;
  growth: GrowthValues;
}

export type ImageField = 'logo' | 'logo_dark' | 'mark' | 'og_image';
export type GrowthFlag = { [K in keyof GrowthValues]: GrowthValues[K] extends number ? K : never }[keyof GrowthValues];

/** Server values with empty strings and zeros in place of nulls. */
export function normalise(settings: { brand: Record<string, unknown>; growth: Record<string, unknown> }): Settings {
  const strings = (values: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value == null ? '' : value]));
  const growth = strings(settings.growth) as Record<string, unknown>;
  for (const [key, value] of Object.entries(growth)) if (typeof value !== 'string' || !key.match(/_(en|am)$/)) growth[key] = Number(value) || 0;
  return { brand: strings(settings.brand) as unknown as BrandValues, growth: growth as unknown as GrowthValues };
}

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST_RE = /^[a-z0-9.-]+(:\d+)?$/i;
const COLOUR_RE = /^#[0-9a-f]{6}$/i;

/** Field → translation key of the first problem. Mirrors the DocType validation. */
export function validate(settings: Settings): Record<string, string> {
  const errors: Record<string, string> = {};
  const { brand, growth } = settings;
  if (!brand.product_name.trim()) errors.product_name = 'staff.brandGrowth.errors.productName';
  for (const field of ['product_url', 'telegram_url'] as const) {
    if (brand[field].trim() && !URL_RE.test(brand[field].trim())) errors[field] = 'staff.brandGrowth.errors.url';
  }
  if (brand.short_host.trim() && !HOST_RE.test(brand.short_host.trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''))) errors.short_host = 'staff.brandGrowth.errors.host';
  if (brand.primary_color && !COLOUR_RE.test(brand.primary_color)) errors.primary_color = 'staff.brandGrowth.errors.colour';
  if (brand.support_email.trim() && !EMAIL_RE.test(brand.support_email.trim())) errors.support_email = 'staff.brandGrowth.errors.email';
  for (const field of ['share_message_en', 'share_message_am'] as const) {
    if (growth[field].trim() && !growth[field].includes('{link}')) errors[field] = 'staff.brandGrowth.errors.link';
  }
  for (const field of ['referral_threshold_bookings', 'referral_reward_free_bookings', 'partner_reward_free_bookings'] as const) {
    if (growth[field] < 0) errors[field] = 'staff.brandGrowth.errors.min0';
  }
  if (growth.customer_referral_default_percent < 0 || growth.customer_referral_default_percent > 100) errors.customer_referral_default_percent = 'staff.brandGrowth.errors.percent';
  if (growth.marketing_live_minutes < 1) errors.marketing_live_minutes = 'staff.brandGrowth.errors.min1';
  return errors;
}

/** Only the fields that differ from the saved values. */
export function changes<T extends object>(saved: T, draft: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => (saved as Record<string, unknown>)[key] !== value),
  ) as Partial<T>;
}
