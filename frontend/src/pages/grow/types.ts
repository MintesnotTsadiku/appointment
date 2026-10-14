import type { ShareSource } from './share-core';

export const GROW_API = 'appointment.growth.sharing.grow_context';
export const SLUG_CHECK_API = 'appointment.growth.short_links.check';
export const SLUG_CHANGE_API = 'appointment.growth.short_links.change';
export const POSTER_API = '/api/method/appointment.growth.poster.poster';

export type Lang = 'en' | 'am';

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  host: string;
}

export interface GrowContext {
  business: { key: string; kind: 'organization' | 'provider'; name: string; logo: string };
  link: {
    url: string;
    path: string;
    short: string;
    slug: string | null;
    published: boolean;
    site: string | null;
    tracked: Record<ShareSource, string>;
  };
  messages: { templates: Record<Lang, string>; en: string; am: string };
  preview: Record<Lang, LinkPreview> | null;
  posters: { enabled: boolean; locations: { name: string; label: string }[] };
  /** `kind`: the website address, or (an independent provider without a website) the provider page address. */
  slug: { editable: boolean; kind?: 'site' | 'provider_page' | null; rules: { min: number; max: number; pattern: string }; aliases: string[] };
  stats: { days: number; visits: Record<ShareSource, number>; bookings: Record<ShareSource, number> };
}

export interface SlugCheck {
  slug: string;
  available: boolean;
  reason: 'current' | 'length' | 'format' | 'reserved' | 'taken' | null;
  current: string;
  suggestions: string[];
}
