import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { CalendarX2 } from 'lucide-react';
import { Card, CardContent } from '@/components/card';
import { Skeleton } from '@/components/skeleton';
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
import { PROVIDER_PAGE_API, PROVIDER_ROOT, localized, providerBio, type ProviderPageData } from './provider-core';
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
  const { data, error } = useFrappeGetCall<{ message: ProviderPageData }>(PROVIDER_PAGE_API, { slug: providerSlug }, `provider-page-${providerSlug}`, { revalidateOnFocus: false });
  const page = data?.message;
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
  const name = page ? localized(page.person?.name, language, page.name) : '';
  const logo = brand.config?.identity?.logoCompact || brand.config?.identity?.logoPrimary || '';
  let body;
  if (error) body = <Unavailable />;
  else if (!page) body = <Loading label={t('public.providerPage.loading')} />;
  // Phone: who, then the services, then the places. Desktop: who and places on the left, services on the right.
  else body = <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-x-10">
    <aside className="lg:col-start-1 lg:row-start-1"><ProviderHero page={page} name={name} /></aside>
    <aside className="order-last lg:order-none lg:col-start-1 lg:row-start-2"><ProviderPlaces places={page.locations} /></aside>
    <section aria-labelledby="provider-services-title" className="min-w-0 space-y-5 lg:col-start-2 lg:row-span-3 lg:row-start-1">
      <div className="space-y-1.5">
        <h2 id="provider-services-title" className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--booking-font-display)' }}>{t('public.providerPage.services')}</h2>
        <p className="text-theme-secondary">{t('public.providerPage.servicesIntro')}</p>
      </div>
      <CustomerInviteBanner providerSlug={page.canonical_slug} />
      <ul className="grid gap-4" data-qa="provider-services">
        {page.services.map((service) => <li key={service.service}><ServiceCard service={service} slug={page.canonical_slug} branded={branded} /></li>)}
      </ul>
    </section>
  </div>;

  return <div className="booking-experience min-h-screen text-theme-primary" data-qa="provider-page"
    data-booking-branded={branded ? 'true' : 'false'} data-pe-recipe={brand.config?.recipeKey}
    style={{ ...brand.style, backgroundColor: 'var(--bg-primary)' }}>
    {page && <MetaTags title={fill(t('public.providerPage.metaTitle'), name)} description={providerBio(page, language) || undefined}
      canonical={`${window.location.origin}${PROVIDER_ROOT}${page.canonical_slug}`} />}
    <header className="sticky top-0 z-20 border-b border-theme-subtle backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 82%, transparent)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="flex min-w-0 items-center gap-2.5">
          {branded && logo && <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-full object-contain" />}
          <span className="truncate font-semibold" data-qa="provider-page-business">{page?.business_name ?? ''}</span>
        </span>
        <LanguageToggle />
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{body}</main>
    {page && growth.poweredByPages && <PoweredBy variant="footer" source="powered_by_page" className="mx-auto max-w-6xl px-4 sm:px-6" />}
  </div>;
}

function Unavailable() {
  const { t } = useTranslation();
  return <Card data-qa="provider-page-unavailable" className="mx-auto max-w-xl rounded-2xl text-center"><CardContent className="space-y-3 p-8">
    <CalendarX2 className="mx-auto h-10 w-10 text-theme-secondary" aria-hidden="true" />
    <h1 className="text-xl font-semibold">{t('public.providerPage.unavailableTitle')}</h1>
    <p className="text-sm text-theme-secondary">{t('public.providerPage.unavailable')}</p>
  </CardContent></Card>;
}

function Loading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label} className="grid gap-6 lg:grid-cols-[380px_1fr] lg:gap-10">
    <Skeleton className="h-96 rounded-2xl" />
    <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
  </div>;
}
