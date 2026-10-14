/**
 * Organization service chooser: the business summary, a sticky bar with category tabs (it shows the
 * business name once the summary scrolls away), providers as a sideways row that filters the services,
 * and a grid of service cards. See docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock, LayoutGrid, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { BookingState } from "@/components/booking-states";
import { priceLabel } from "@/pages/public-experience/provider-core";
import { shortProviderName } from "../DateTimeSelector/TimeSlotsPanel";
import type { Service, Organization, Provider } from "../../types";
import "../DateTimeSelector/layout.css";

interface ServiceSelectorProps {
  organization: Organization;
  services: Service[];
  onServiceSelect: (service: Service) => void;
  loading?: boolean;
  className?: string;
}

type Category = "all" | Service["type"];
const CATEGORY_KEYS: Record<Exclude<Category, "all">, string> = {
  individual: "serviceSelector.individualTitle",
  organization: "serviceSelector.generalTitle",
  group: "serviceSelector.groupTitle",
};

/** Whether a provider offers a service: their own service, or a shared one that lists them. */
function offers(provider: Provider, service: Service) {
  return service.provider?.id === provider.id || (service.type === "organization" && Boolean(provider.services?.includes(service.name)));
}

export function ServiceSelector({ organization, services, onServiceSelect, className }: ServiceSelectorProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>("all");
  const [providerId, setProviderId] = useState<string>("all");
  const hero = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);

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

  return (
    <div role="region" aria-label={t("serviceSelector.title")} className={`mx-auto w-full max-w-6xl space-y-5 ${className ?? ""}`} data-qa="booking-services">
      <header ref={hero} className="bk-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7" data-qa="booking-business">
        <Avatar className="h-16 w-16 shrink-0 rounded-2xl sm:h-20 sm:w-20">
          <AvatarImage src={organization.logo} alt="" className="object-cover" />
          <AvatarFallback className="rounded-2xl text-2xl font-semibold" style={{ background: "var(--accent-primary-light)", color: "var(--accent-primary)" }}>
            {organization.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold leading-tight text-balance sm:text-3xl" style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>
            {organization.name}
          </h1>
          {organization.description && (
            <p className="line-clamp-3 max-w-3xl leading-relaxed sm:line-clamp-2" style={{ color: "var(--text-secondary)" }}>{organization.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />{countLabel(t, "service", services.length)}</span>
            {soleProvider ? (
              <span className="inline-flex items-center gap-2" data-qa="booking-sole-provider">
                <Avatar className="h-6 w-6"><AvatarImage src={soleProvider.avatar} alt="" /><AvatarFallback className="text-[0.6rem]">{soleProvider.name.charAt(0)}</AvatarFallback></Avatar>
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
            <Avatar className="h-7 w-7 rounded-lg"><AvatarImage src={organization.logo} alt="" /><AvatarFallback className="rounded-lg text-xs">{organization.name.charAt(0)}</AvatarFallback></Avatar>
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
            <h2 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("serviceSelector.title")}</h2>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-muted)" }} aria-live="polite">{countLabel(t, "service", shown.length)}</span>
      </div>

      {providers.length > 1 && (
        <section aria-labelledby="bk-providers-title" className="space-y-2.5" data-qa="booking-providers">
          <h2 id="bk-providers-title" className="bk-eyebrow">{t("serviceSelector.ourProviders")}</h2>
          <div className="bk-days" role="group" aria-labelledby="bk-providers-title">
            <button type="button" className="bk-chip !min-h-14 !rounded-2xl !px-4" aria-pressed={providerId === "all"} onClick={() => setProviderId("all")}>
              <Users className="h-4 w-4" aria-hidden="true" />{t("bookingPicker.allProviders")}
            </button>
            {providers.map((row) => (
              <button key={row.id} type="button" className="bk-chip !min-h-14 !rounded-2xl !pl-2 !pr-4" aria-pressed={providerId === row.id}
                onClick={() => setProviderId(providerId === row.id ? "all" : row.id)} data-qa="booking-provider" title={row.name}>
                <Avatar className="h-10 w-10"><AvatarImage src={row.avatar} alt="" className="object-cover" /><AvatarFallback>{row.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <span className="flex flex-col items-start leading-tight">
                  <span>{shortProviderName(row.name)}</span>
                  <span className="text-xs font-normal opacity-75">{countLabel(t, "service", services.filter((service) => offers(row, service)).length)}</span>
                </span>
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((service) => (
            <li key={service.slug || service.id} className="flex">
              <ServiceCard service={service} onSelect={onServiceSelect}
                providers={service.type === "organization" ? providers.filter((row) => offers(row, service)) : []} showProvider={!soleProvider} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceCard({ service, onSelect, providers, showProvider }: { service: Service; onSelect: (service: Service) => void; providers: Provider[]; showProvider: boolean }) {
  const { t, language } = useTranslation();
  return (
    <button
      type="button"
      data-qa="booking-service"
      data-qa-service-slug={service.slug}
      onClick={() => onSelect(service)}
      className="bk-card group flex w-full flex-col gap-3 p-5 text-start transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-(--accent-primary) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--accent-primary) motion-reduce:transform-none"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{service.name}</h3>
        {Boolean(service.price && service.price > 0) && (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums" data-qa="booking-service-price"
            style={{ backgroundColor: "var(--accent-primary-light)", color: "var(--booking-action-text, var(--accent-primary))" }}>
            {priceLabel(Number(service.price), service.currency || "ETB", language, "")}
          </span>
        )}
      </div>
      {showProvider && service.provider?.name && (
        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Avatar className="h-6 w-6"><AvatarImage src={service.provider.avatar} alt="" /><AvatarFallback className="text-[0.6rem]">{service.provider.name.charAt(0)}</AvatarFallback></Avatar>
          {shortProviderName(service.provider.name)}
        </span>
      )}
      {providers.length > 1 && (
        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="flex -space-x-2">
            {providers.slice(0, 3).map((row) => (
              <Avatar key={row.id} className="h-6 w-6 border-2" style={{ borderColor: "var(--bg-elevated)" }}>
                <AvatarImage src={row.avatar} alt="" /><AvatarFallback className="text-[0.6rem]">{row.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </span>
          {countLabel(t, "provider", providers.length)}
        </span>
      )}
      {service.description && <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{service.description}</p>}
      <span className="mt-auto flex w-full items-center justify-between gap-3 pt-3 text-sm" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <Clock className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
          {t("bookingPicker.minutes").replace("{0}", String(service.duration))}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--booking-action-text, var(--accent-primary))" }}>
          {t("serviceSelector.book")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

function countLabel(t: (key: string) => string, noun: "provider" | "service", count: number) {
  return count === 1 ? t(`serviceSelector.${noun}One`) : t(`serviceSelector.${noun}Many`).replace("{0}", String(count));
}
