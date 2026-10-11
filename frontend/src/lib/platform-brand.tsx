import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { PUBLIC_BRAND_API, toPlatformBrand, withBrand, type PlatformBrand, type PublicBrandPayload } from './platform-brand-core';

export * from './platform-brand-core';

/**
 * The platform's own brand and the public growth switches.
 *
 * The server injects them into the SPA shell boot (`frappe.boot.platform_brand`), so
 * production paints the right name on the first frame. The Vite dev shell has no boot,
 * so the hook falls back to the current host and fetches `public_brand` once per page load.
 */

type Listener = (payload: PublicBrandPayload) => void;

function bootPayload(): PublicBrandPayload | null {
  if (typeof window === 'undefined') return null;
  const boot = (window as unknown as { frappe?: { boot?: { platform_brand?: PublicBrandPayload } } }).frappe?.boot;
  return boot?.platform_brand ?? null;
}

let cached: PublicBrandPayload | null = bootPayload();
let request: Promise<void> | null = null;
const listeners = new Set<Listener>();

function load(): void {
  if (cached || request) return;
  request = fetch(PUBLIC_BRAND_API, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((body: { message?: PublicBrandPayload }) => {
      if (!body.message) return;
      cached = body.message;
      listeners.forEach((listener) => listener(body.message as PublicBrandPayload));
    })
    // The fallback brand stays; a later mount may try again.
    .catch(() => undefined)
    .finally(() => {
      request = null;
    });
}

/** Refresh every mounted consumer after the platform admin saves the settings. */
export function setPlatformBrandPayload(payload: PublicBrandPayload): void {
  cached = payload;
  listeners.forEach((listener) => listener(payload));
}

/** Force the next mount to fetch again (used after a save). */
export function reloadPlatformBrand(): void {
  cached = null;
  load();
}

export function usePlatformBrand(): PlatformBrand {
  const { language } = useTranslation();
  const [payload, setPayload] = useState<PublicBrandPayload | null>(cached);
  useEffect(() => {
    const listener: Listener = (next) => setPayload(next);
    listeners.add(listener);
    if (cached && cached !== payload) setPayload(cached);
    load();
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return toPlatformBrand(payload, language);
}

/** `useTranslation()` whose `t` fills `{product}` and `{host}` with the platform brand. */
export function useBrandedTranslation() {
  const translation = useTranslation();
  const brand = usePlatformBrand();
  return { ...translation, brand, t: (key: string) => withBrand(translation.t(key), brand) };
}
