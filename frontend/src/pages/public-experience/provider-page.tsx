import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { RotateCw } from 'lucide-react';
import { BookingState, ProviderPageSkeleton, previewState } from '@/components/booking-states';
import '@/pages/booking-v2/components/DateTimeSelector/layout.css';
import { ThemeSwitch } from '@/pages/organization-appointment/header';
import LanguageToggle from '@/components/language-toggle';
import MetaTags from '@/components/meta-tags';
import PoweredBy from '@/components/powered-by';
import CustomerInviteBanner from '@/components/growth-referrals/CustomerInviteBanner';
import { usePlatformBrand } from '@/lib/platform-brand';
import { useTheme } from '@/components/theme-provider';
import { useBookingBrand } from '@/public-experience/bookingTheme';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';
import '@/public-experience/platform.css';
import { PROVIDER_PAGE_API, PROVIDER_ROOT, localized, providerBio, serviceFormats, type PlaceType, type ProviderPageData } from './provider-core';
import { ProviderHero, ProviderPlaces, ServiceCard } from './provider-page-parts';

/**
 * The public page of an independent provider: who they are and every service they offer.
 * Each service opens its scheduler at `/schedule/p/<slug>/<offering>`. A provider with a published
 * website lends the page its template's colours and type. See docs/growth/PROVIDER_PAGE.md.
 */
export default function ProviderPage() {
  const { t, language, setLanguage, languages } = useTranslation();
  const { providerSlug = '' } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { growth } = usePlatformBrand();
  const { resolvedTheme } = useTheme();
  const { data, error, mutate } = useFrappeGetCall<{ message: ProviderPageData }>(PROVIDER_PAGE_API, { slug: providerSlug }, `provider-page-${providerSlug}`, { revalidateOnFocus: false });
  const preview = previewState();
  const forced = preview === 'loading' || preview === 'error' || preview === 'unavailable' ? preview : null;
  const page = forced ? undefined : data?.message;
  const failed = forced === 'error' || Boolean(error && (!error.httpStatus || error.httpStatus >= 500));
  const brand = useBookingBrand(page?.site_slug || undefined, resolvedTheme === 'dark' ? 'dark' : 'light');

  // A shared Amharic link (`?lang=am`) opens in Amharic. Once per visit: the dev double effect would
  // otherwise save the preference twice at the same moment.
  const langApplied = useRef(false);
  useEffect(() => {
    if (langApplied.current) return;
    langApplied.current = true;
    const lang = new URLSearchParams(search).get('lang');
    if (lang && lang !== language && languages.includes(lang)) setLanguage(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A former address shows the current one in the address bar.
  useEffect(() => {
    if (page && page.canonical_slug && page.canonical_slug !== providerSlug) {
      navigate(`${PROVIDER_ROOT}${page.canonical_slug}${search}`, { replace: true });
    }
  }, [page, providerSlug, search, navigate]);

  const branded = Boolean(brand.config);
  // Many services that meet in both ways: a format filter keeps the list short.
  const [format, setFormat] = useState<'all' | PlaceType>('all');
  const formatCounts = (page?.services ?? []).reduce((counts, service) => {
    for (const type of serviceFormats(service)) counts[type] += 1;
    return counts;
  }, { online: 0, in_person: 0 } as Record<PlaceType, number>);
  const showFormatFilter = (page?.services.length ?? 0) >= 4 && formatCounts.online > 0 && formatCounts.in_person > 0;
  const services = (page?.services ?? []).filter((service) => format === 'all' || serviceFormats(service).includes(format));
  const name = page ? localized(page.person?.name, language, page.name) : '';
  const logo = brand.config?.identity?.logoCompact || brand.config?.identity?.logoPrimary || '';
  let body;
  if (error || forced === 'error' || forced === 'unavailable') body = <Unavailable failed={failed} onRetry={() => void mutate()} />;
  else if (!page) body = <ProviderPageSkeleton label={t('public.providerPage.loading')} />;
  // Phone: who, then the services, then the places. Desktop: who and places in a sticky column, services on the right.
  else body = <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-x-10">
    <aside className="contents lg:sticky lg:top-[calc(var(--bk-top)+1.5rem)] lg:col-start-1 lg:row-start-1 lg:flex lg:max-h-[calc(100dvh-var(--bk-top)-3rem)] lg:flex-col lg:gap-6 lg:overflow-y-auto lg:overscroll-contain" data-qa="provider-page-aside">
      <div className="order-first"><ProviderHero page={page} name={name} /></div>
      <div className="order-last lg:order-none"><ProviderPlaces places={page.locations} /></div>
    </aside>
    <section aria-labelledby="provider-services-title" className="min-w-0 space-y-5 lg:col-start-2 lg:row-start-1">
      <div className="space-y-1.5">
        <h2 id="provider-services-title" className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--booking-font-display)' }}>{t('public.providerPage.services')}</h2>
        <p className="text-theme-secondary">{t('public.providerPage.servicesIntro')}</p>
      </div>
      <CustomerInviteBanner providerSlug={page.canonical_slug} />
      {showFormatFilter && <div className="bk-days !mx-0 !px-0" role="group" aria-label={t('public.providerPage.formats')} data-qa="provider-format-filter">
        {([['all', t('bookingLayout.allServices'), page.services.length], ['online', t('public.providerPage.formatsOnline'), formatCounts.online],
          ['in_person', t('public.providerPage.formatsInPerson'), formatCounts.in_person]] as const).map(([key, label, count]) => (
          <button key={key} type="button" className="bk-chip" aria-pressed={format === key} onClick={() => setFormat(key)}>
            {label}<span className="tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>}
      <ul className="grid gap-4" data-qa="provider-services">
        {services.map((service) => <li key={service.service}><ServiceCard service={service} slug={page.canonical_slug} branded={branded} /></li>)}
      </ul>
    </section>
  </div>;

  return <div className="booking-experience flex min-h-screen flex-col text-theme-primary" data-qa="provider-page"
    data-booking-branded={branded ? 'true' : 'false'} data-pe-recipe={brand.config?.recipeKey}
    style={{ ...brand.style, '--bk-top': '4rem', backgroundColor: 'var(--bg-primary)' } as CSSProperties}>
    {page && <MetaTags title={fill(t('public.providerPage.metaTitle'), name)} description={providerBio(page, language) || undefined}
      canonical={`${window.location.origin}${PROVIDER_ROOT}${page.canonical_slug}`} />}
    <header className="sticky top-0 z-20 h-16 border-b border-theme-subtle backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)' }}>
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <span className="flex min-w-0 items-center gap-2.5">
          {branded && logo && <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-full object-contain" />}
          <span className="truncate font-semibold" data-qa="provider-page-business">
            {page?.business_name ?? (error || forced ? '' : <span className="bk-bone inline-block h-4 w-40 align-middle" aria-hidden="true" />)}
          </span>
        </span>
        <div className="flex items-center gap-2"><LanguageToggle /><ThemeSwitch /></div>
      </div>
    </header>
    <main className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${error || forced === 'error' || forced === 'unavailable' ? 'flex flex-1 items-center py-10' : 'py-6 sm:py-10'}`}>
      <div className="w-full">{body}</div>
    </main>
    {page && growth.poweredByPages && <PoweredBy variant="footer" source="powered_by_page" className="mx-auto max-w-6xl px-4 sm:px-6" />}
  </div>;
}

function Unavailable({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return <div className="bk-surface mx-auto max-w-xl px-5 sm:px-10">
    <BookingState kind={failed ? 'error' : 'not-found'} headingLevel={1} qa="provider-page-unavailable"
      title={failed ? t('bookingStates.errorTitle') : t('public.providerPage.unavailableTitle')}
      description={failed ? t('bookingStates.errorBody') : t('public.providerPage.unavailable')}
      actions={[
        ...(failed ? [{ label: t('bookingStates.retry'), onClick: onRetry, icon: RotateCw, qa: 'booking-state-retry' }] : []),
        { label: t('bookingStates.goHome'), href: '/', qa: 'booking-state-home' },
      ]} />
  </div>;
}
