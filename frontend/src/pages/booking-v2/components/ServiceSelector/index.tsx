/**
 * Organization service chooser: the business summary, a sticky bar with category tabs (it shows the
 * business name once the summary scrolls away), providers as a sideways row that filters the services,
 * and one card per service: its photo, name, price, description, who offers it and its length.
 * Choosing a card opens the time picker for the service with any provider, or with the provider of the
 * active filter. See docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock, LayoutGrid, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { BookingState } from "@/components/booking-states";
import { priceLabel } from "@/pages/public-experience/provider-core";
import { shortProviderName } from "../DateTimeSelector/TimeSlotsPanel";
import { PLAIN_SKIN, ServicePhoto, servicePhotoSource, type ActiveSkin } from "../skin";
import type { Service, Organization, Provider } from "../../types";
import "../DateTimeSelector/layout.css";

interface ServiceSelectorProps {
  organization: Organization;
  services: Service[];
  /** `providerId` is the active provider filter, or "all". */
  onServiceSelect: (service: Service, providerId: string) => void;
  /** The booking skin of the published website, for photos and frames (the default skin without one). */
  skin?: ActiveSkin;
  /** The business logo: the business's own, else the published brand logo. */
  logo?: string;
  /** False while the published design loads: photo frames keep their place and load nothing yet. */
  photosReady?: boolean;
  loading?: boolean;
  className?: string;
}

type Category = "all" | Service["type"];
const CATEGORY_KEYS: Record<Exclude<Category, "all">, string> = {
  individual: "serviceSelector.individualTitle",
  organization: "serviceSelector.generalTitle",
  group: "serviceSelector.groupTitle",
};

/** Whether a provider offers a service: one of its offerings, or a shared service that lists them. */
function offers(provider: Provider, service: Service) {
  if (service.offerings?.length) return service.offerings.some((offering) => offering.provider?.id === provider.id);
  return service.provider?.id === provider.id || (service.type === "organization" && Boolean(provider.services?.includes(service.name)));
}

/** The providers of a service, in the order of the business's provider row. */
function providersOf(providers: Provider[], service: Service): Provider[] {
  return providers.filter((provider) => offers(provider, service));
}

export function ServiceSelector({ organization, services, onServiceSelect, skin = PLAIN_SKIN, logo, photosReady = true, className }: ServiceSelectorProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>("all");
  const [providerId, setProviderId] = useState<string>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const hero = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const businessLogo = organization.logo || logo;

  // The sticky bar shows the business once its summary has scrolled away.
  useEffect(() => {
    const element = hero.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const categories = useMemo(() => {
    const present = (["individual", "organization", "group"] as const).filter((type) => services.some((service) => service.type === type));
    return present.length > 1 ? (["all", ...present] as Category[]) : [];
  }, [services]);
  const providers = organization.providers;
  const provider = providers.find((row) => row.id === providerId);
  const shown = services.filter((service) => (category === "all" || service.type === category) && (!provider || offers(provider, service)));
  const soleProvider = providers.length === 1 ? providers[0] : null;
  const choose = (service: Service) => {
    setPicked(service.slug);
    onServiceSelect(service, providerId);
  };

  return (
    <div role="region" aria-label={t("serviceSelector.title")} className={`mx-auto w-full max-w-6xl space-y-5 ${className ?? ""}`} data-qa="booking-services">
      <header ref={hero} className="bk-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-7" data-qa="booking-business">
        {/* The published brand logo (the header already loaded it); a plain image, so it loads once. */}
        {businessLogo ? (
          <img className="bk-business-logo h-14 w-14 shrink-0 rounded-2xl object-contain p-1.5 sm:h-20 sm:w-20" src={businessLogo} alt="" width={80} height={80}
            decoding="async" style={{ background: "var(--accent-primary-light)" }} data-qa="booking-business-logo" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-semibold sm:h-20 sm:w-20" aria-hidden="true"
            style={{ background: "var(--accent-primary-light)", color: "var(--accent-primary)" }} data-qa="booking-business-logo">{organization.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl leading-tight text-balance sm:text-3xl" style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>
            {organization.name}
          </h1>
          {organization.description && (
            <p className="line-clamp-3 max-w-3xl leading-relaxed sm:line-clamp-2" style={{ color: "var(--text-secondary)" }}>{organization.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />{countLabel(t, "service", services.length)}</span>
            {soleProvider ? (
              <span className="inline-flex items-center gap-2" data-qa="booking-sole-provider">
                <Avatar className="bk-avatar h-6 w-6"><AvatarImage src={soleProvider.avatar} alt="" /><AvatarFallback className="text-[0.6rem]">{soleProvider.name.charAt(0)}</AvatarFallback></Avatar>
                {t("bookingPicker.with").replace("{0}", shortProviderName(soleProvider.name))}
              </span>
            ) : providers.length > 1 && (
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />{countLabel(t, "provider", providers.length)}</span>
            )}
          </div>
        </div>
      </header>

      {/* Sticky under the page header: the business once the summary scrolls away, and the categories. */}
      <div className="sticky z-20 flex min-h-14 items-center gap-3 rounded-b-2xl px-1 py-2 transition-[background-color,padding] duration-200 motion-reduce:transition-none data-[compact=true]:px-4" data-qa="booking-services-bar" data-compact={compact ? "true" : "false"}
        style={{ top: "var(--bk-top, 0px)", backgroundColor: compact ? "color-mix(in srgb, var(--bg-elevated) 94%, transparent)" : "transparent", backdropFilter: compact ? "blur(12px)" : undefined, borderStyle: "solid", borderColor: compact ? "var(--border-default)" : "transparent", borderWidth: "0 1px 1px" }}>
        {compact && (
          <span className="flex min-w-0 shrink items-center gap-2 max-sm:hidden" aria-hidden="true">
            {businessLogo ? <img className="h-7 w-7 rounded-lg object-contain" src={businessLogo} alt="" width={28} height={28} decoding="async" />
              : <span className="grid h-7 w-7 place-items-center rounded-lg text-xs" style={{ background: "var(--accent-primary-light)" }}>{organization.name.charAt(0)}</span>}
            <span className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{organization.name}</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          {categories.length > 0 ? (
            <div className="bk-days !mx-0 !px-0" role="group" aria-label={t("bookingLayout.categories")}>
              {categories.map((key) => (
                <button key={key} type="button" className="bk-chip" aria-pressed={category === key} onClick={() => setCategory(key)} data-qa="booking-category">
                  {key === "all" ? t("bookingLayout.allServices") : t(CATEGORY_KEYS[key])}
                  <span className="tabular-nums opacity-70">{key === "all" ? services.length : services.filter((service) => service.type === key).length}</span>
                </button>
              ))}
            </div>
          ) : (
            <h2 className="truncate text-lg" style={{ color: "var(--text-primary)" }}>{t("serviceSelector.title")}</h2>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-muted)" }} aria-live="polite">{countLabel(t, "service", shown.length)}</span>
      </div>

      {providers.length > 1 && (
        <section aria-labelledby="bk-providers-title" className="space-y-2.5" data-qa="booking-providers">
          <h2 id="bk-providers-title" className="bk-eyebrow">{t("serviceSelector.ourProviders")}</h2>
          <div className="bk-days" role="group" aria-labelledby="bk-providers-title">
            <button type="button" className="bk-chip !min-h-12 !px-4" aria-pressed={providerId === "all"} onClick={() => setProviderId("all")} data-qa="booking-provider-all">
              <Users className="h-4 w-4" aria-hidden="true" />{t("bookingPicker.anyProvider")}
            </button>
            {providers.map((row) => (
              <button key={row.id} type="button" className="bk-chip !min-h-12 !pl-1.5 !pr-4" aria-pressed={providerId === row.id}
                onClick={() => setProviderId(providerId === row.id ? "all" : row.id)} data-qa="booking-provider" title={row.name}>
                <Avatar className="bk-avatar h-9 w-9"><AvatarImage src={row.avatar} alt="" className="object-cover" /><AvatarFallback>{row.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <span>{shortProviderName(row.name)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {shown.length === 0 ? (
        <div className="bk-card px-5">
          <BookingState kind="empty" compact headingLevel={2} qa="booking-services-empty"
            title={services.length ? t("bookingLayout.noMatchTitle") : t("bookingLayout.noServicesTitle")}
            description={services.length ? t("bookingLayout.noMatchBody") : t("bookingLayout.noServicesBody")}
            actions={services.length ? [{ label: t("bookingStates.seeServices"), onClick: () => { setCategory("all"); setProviderId("all"); } }] : []} />
        </div>
      ) : (
        <ul className="bk-service-grid">
          {shown.map((service) => (
            <li key={service.slug || service.id} className="flex">
              <ServiceCard service={service} onSelect={choose} picked={picked === service.slug}
                photo={photosReady ? servicePhotoSource(skin, service.image, service.photoIndex ?? -1) : null}
                pending={!photosReady && Boolean(service.image)}
                providers={providersOf(providers, service)} only={provider} showProvider={!soleProvider} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceCard({ service, onSelect, providers, only, showProvider, photo, pending, picked }: {
  service: Service; onSelect: (service: Service) => void; providers: Provider[]; only?: Provider; showProvider: boolean;
  photo: ReturnType<typeof servicePhotoSource>; pending: boolean; picked: boolean;
}) {
  const { t, language } = useTranslation();
  const price = service.price && service.price > 0 ? priceLabel(Number(service.price), service.currency || "ETB", language, "") : "";
  const team = only ? [only] : providers;
  const who = only || team.length === 1 ? t("bookingPicker.with").replace("{0}", shortProviderName((only || team[0]).name)) : t("bookingPicker.anyProvider");
  return (
    <button
      type="button"
      data-qa="booking-service"
      data-qa-service-slug={service.slug}
      data-picked={picked ? "true" : undefined}
      data-photo={photo || pending ? "true" : "false"}
      onClick={() => onSelect(service)}
      aria-label={[service.name, price && (service.priceFrom ? t("serviceSelector.priceFrom").replace("{0}", price) : price),
        t("bookingPicker.minutes").replace("{0}", String(service.duration)), showProvider && team.length ? who : ""].filter(Boolean).join(" · ")}
      className="bk-card bk-service group text-start"
    >
      {photo ? <ServicePhoto asset={photo} sizes="(max-width: 639px) 96px, 360px" className="bk-service-photo" />
        : pending ? <span className="bk-photo bk-service-photo" aria-hidden="true" /> : null}
      <span className="bk-service-body">
        <span className="flex w-full items-start justify-between gap-3">
          <span className="bk-service-name">{service.name}</span>
          {price && (
            <span className="shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums" data-qa="booking-service-price"
              style={{ backgroundColor: "var(--accent-primary-light)", color: "var(--booking-action-text, var(--accent-primary))" }}>
              {service.priceFrom ? t("serviceSelector.priceFrom").replace("{0}", price) : price}
            </span>
          )}
        </span>
        {service.description && <span className="bk-service-text">{service.description}</span>}
        {showProvider && team.length > 0 && (
          <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }} data-qa="booking-service-team">
            <span className="flex -space-x-2">
              {team.slice(0, 4).map((row) => (
                <Avatar key={row.id} className="bk-avatar h-7 w-7 border-2" style={{ borderColor: "var(--bg-elevated)" }}>
                  <AvatarImage src={row.avatar} alt="" className="object-cover" /><AvatarFallback className="text-[0.6rem]">{row.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </span>
            <span className="truncate">{who}</span>
          </span>
        )}
        <span className="mt-auto flex w-full items-center justify-between gap-3 pt-3 text-sm" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <Clock className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
            {t("bookingPicker.minutes").replace("{0}", String(service.duration))}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--booking-action-text, var(--accent-primary))" }}>
            {t("serviceSelector.chooseTime")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
        </span>
      </span>
    </button>
  );
}

function countLabel(t: (key: string) => string, noun: "provider" | "service", count: number) {
  return count === 1 ? t(`serviceSelector.${noun}One`) : t(`serviceSelector.${noun}Many`).replace("{0}", String(count));
}
