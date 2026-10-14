import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Clock3, Globe, Languages, LayoutList, MapPin, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';
import {
  LANGUAGE_NAMES, formatLabel, groupFormats, initials, localized, offeringPath, priceLabel, serviceFormats,
  type FormatChoice, type ProviderPageData, type ProviderPlace, type ProviderService,
} from './provider-core';

const SURFACE = 'rounded-2xl border border-theme-default';
const surfaceStyle = { backgroundColor: 'var(--bg-elevated)' };

/** Photo or initials, name, role, bio and spoken languages. */
export function ProviderHero({ page, name }: { page: ProviderPageData; name: string }) {
  const { t, language } = useTranslation();
  const role = localized(page.person?.role, language);
  const subtitle = role || (page.business_name !== name ? page.business_name : '');
  const formats = new Set(page.services.flatMap((service) => serviceFormats(service)));
  const formatsText = formats.size > 1 ? t('public.providerPage.formatsBoth')
    : formats.has('online') ? t('public.providerPage.formatsOnline') : t('public.providerPage.formatsInPerson');
  return <section className={`${SURFACE} overflow-hidden`} style={surfaceStyle} data-qa="provider-page-hero">
    {/* A website's hero photo, else a soft wash of the accent colour. */}
    <div className="h-24 bg-cover bg-center sm:h-28" aria-hidden="true" data-qa="provider-page-cover"
      style={{ backgroundImage: page.cover ? `linear-gradient(to bottom, transparent 40%, color-mix(in srgb, var(--bg-elevated) 35%, transparent)), url("${page.cover}")`
        : 'radial-gradient(120% 140% at 0% 0%, var(--accent-primary-light), transparent 70%), linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary) 14%, transparent), transparent)' }} />
    <div className="-mt-12 space-y-4 px-5 pb-6 sm:px-7 sm:pb-7">
      <Avatar className="h-24 w-24 border-4 shadow-sm" style={{ borderColor: 'var(--bg-elevated)' }}>
        {page.photo && <AvatarImage src={page.photo} alt={localized(page.person?.imageAlt, language, name)} className="object-cover" />}
        <AvatarFallback className="text-2xl font-semibold" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h1 data-qa="provider-page-name" className="text-2xl font-semibold leading-tight sm:text-3xl" style={{ fontFamily: 'var(--booking-font-display)' }}>{name}</h1>
        {subtitle && <p className="text-theme-secondary" data-qa="provider-page-role">{subtitle}</p>}
      </div>
      {page.bio && <p className="leading-relaxed text-theme-secondary" data-qa="provider-page-bio">{page.bio}</p>}
      <dl className="space-y-2.5 border-t border-theme-subtle pt-4 text-sm">
        <Fact icon={LayoutList} label={t('public.providerPage.services')}>{fill(t('public.providerPage.servicesCount'), page.services.length)}</Fact>
        <Fact icon={formats.has('online') ? Video : MapPin} label={t('public.providerPage.formats')}>{formatsText}</Fact>
        {page.languages.length > 0 && <Fact icon={Languages} label={t('public.providerPage.speaks')}>
          <span className="flex flex-wrap gap-1.5" data-qa="provider-page-languages">
            {page.languages.map((code) => <Badge key={code} variant="outline" className="border-theme-default font-normal">{LANGUAGE_NAMES[code] ?? code}</Badge>)}
          </span>
        </Fact>}
      </dl>
      {page.site_slug && <Button asChild variant="outline" className="h-11 w-full" data-qa="provider-page-website">
        <a href={`/${page.site_slug}`}><Globe aria-hidden="true" />{t('public.providerPage.website')}</a>
      </Button>}
    </div>
  </section>;
}

function Fact({ icon: Icon, label, children }: { icon: typeof Video; label: string; children: ReactNode }) {
  return <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" aria-hidden="true" />
    <div className="min-w-0 space-y-1"><dt className="sr-only">{label}</dt><dd>{children}</dd></div>
  </div>;
}

/** The places the provider meets customers: offices with their address, online rooms with their platform. */
export function ProviderPlaces({ places }: { places: ProviderPlace[] }) {
  const { t } = useTranslation();
  if (!places.length) return null;
  return <section className={`${SURFACE} p-5 sm:p-6`} style={surfaceStyle} aria-labelledby="provider-places-title" data-qa="provider-page-places">
    <h2 id="provider-places-title" className="mb-3 text-xs font-semibold uppercase tracking-wider text-theme-secondary" style={{ fontFamily: 'var(--booking-font-body)' }}>{t('public.providerPage.places')}</h2>
    <ul className="space-y-3">
      {places.map((place) => {
        const online = place.location_type === 'online';
        const Icon = online ? Video : MapPin;
        return <li key={place.name} className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--accent-primary-light)' }}>
            <Icon className="h-4 w-4 text-(--accent-primary)" aria-hidden="true" />
          </span>
          <span className="min-w-0 text-sm">
            <span className="block font-medium">{place.name}</span>
            <span className="block text-theme-secondary">{online ? formatLabel(place, t('onlineSession.label'), t('onlineSession.labelWith'), '') : place.address}</span>
          </span>
        </li>;
      })}
    </ul>
  </section>;
}

/** One service: what it is, how long, what it costs, how it meets, and the way to its scheduler. */
export function ServiceCard({ service, slug, branded }: { service: ProviderService; slug: string; branded: boolean }) {
  const { t, language } = useTranslation();
  const { search } = useLocation();
  const choices = groupFormats(service);
  const [chosen, setChosen] = useState(choices[0]?.offering ?? '');
  const choice = choices.find((row) => row.offering === chosen) ?? choices[0];
  const name = localized(service.names, language, service.name);
  const description = localized(service.descriptions, language, service.description);
  if (!choice) return null;
  return <article className={`${SURFACE} group flex flex-col gap-3 p-5 transition-colors hover:border-(--accent-primary) sm:p-6`} style={surfaceStyle}
    data-qa="provider-service" data-service={service.service}>
    <div className="flex items-start justify-between gap-4">
      <h3 className="min-w-0 text-lg font-semibold leading-snug sm:text-xl" data-qa="provider-service-name">{name}</h3>
      <span className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold tabular-nums" data-qa="provider-service-price"
        style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--booking-action-text, var(--accent-primary))' }}>
        {priceLabel(choice.price, service.currency, language, t('public.providerPage.free'))}
      </span>
    </div>
    {description && <p className="text-sm leading-relaxed text-theme-secondary sm:text-[0.95rem]">{description}</p>}
    {choices.length > 1 && <div className="space-y-2 pt-1">
      <p className="text-sm font-medium" id={`format-${service.service}`}>{t('public.providerPage.howToMeet')}</p>
      <ToggleGroup type="single" value={choice.offering} onValueChange={(value) => value && setChosen(value)}
        aria-labelledby={`format-${service.service}`} className="grid w-full grid-cols-1 sm:inline-flex sm:w-auto" data-qa="provider-format">
        {choices.map((row) => <ToggleGroupItem key={row.offering} value={row.offering} className="h-11 min-w-0 justify-start px-4 sm:justify-center" data-qa="provider-format-option">
          <FormatText choice={row} />
        </ToggleGroupItem>)}
      </ToggleGroup>
    </div>}
    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-theme-secondary">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />{fill(t('public.independentBooking.duration'), choice.duration)}</span>
        {choices.length === 1 && <FormatText choice={choice} />}
      </p>
      <Button asChild size="lg" className="h-11 w-full gap-2 sm:w-auto" data-qa="provider-service-book"
        style={branded ? { backgroundColor: 'var(--accent-primary)', color: 'var(--pe-color-on-primary)' } : undefined}>
        <Link to={offeringPath(slug, choice.offering, search)} aria-label={fill(t('public.providerPage.bookService'), name)}>
          {t('public.providerPage.book')}<ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  </article>;
}

function FormatText({ choice }: { choice: FormatChoice }) {
  const { t } = useTranslation();
  const online = choice.type === 'online';
  const Icon = online ? Video : MapPin;
  const label = formatLabel({ location_type: choice.type, platform: choice.platform, name: choice.place },
    t('onlineSession.label'), t('onlineSession.labelWith'), t('public.providerPage.inPerson'));
  return <span className="inline-flex min-w-0 items-center gap-1.5" data-qa="provider-service-format" data-format={choice.type}>
    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span className="truncate">{choice.place ? `${label} · ${choice.place}` : label}</span>
  </span>;
}
