import { Link } from "react-router-dom";
import { CalendarDays, Coffee, Users, Clock3, Tag } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { TemplateProps as Props } from "../types";
import {
  action,
  durationMinutes,
  formatPrice,
  records,
  section,
  type ContentRecord,
} from "../content";
import { usePublicChrome } from "../chrome";
import { Photo, words, withLocale } from "./elements";
import { SectionHead } from "./Story";
import { useBunaCopy } from "./copy";

export function serviceHref(
  props: Props,
  item: ContentRecord,
  fallback?: string | null,
) {
  return (
    (typeof item.id === "string" && props.snapshot.bookingPaths?.[item.id]) ||
    action(item.action, props.locale)?.href ||
    fallback
  );
}

export function Services({
  props,
  bookingPath,
}: {
  props: Props;
  bookingPath?: string | null;
}) {
  const chrome = usePublicChrome(props.locale);
  const t = useBunaCopy(props.locale);
  const { setLanguage } = useTranslation();
  const content = section(props.snapshot.sections, "services");
  const services = records(content.items);
  const planning = services[3];
  return (
    <section
      id="services"
      className="buna3-section buna3-services"
      data-reveal="rise"
    >
      <SectionHead
        number="03"
        title={words(content.title, props.locale)}
        note={words(content.intro, props.locale)}
      />
      <div className="buna3-service-list">
        {services.slice(0, 3).map((item, i) => {
          const href = serviceHref(props, item, bookingPath);
          return (
            <article className="buna3-service" key={String(item.id || i)}>
              <Photo
                props={props}
                role={`${["yirgacheffe", "pour", "espresso"][i]}.buna`}
                item={item}
                decorative
              />
              <div className="buna3-service-copy">
                <h3>{words(item.name, props.locale)}</h3>
                <p>{words(item.summary, props.locale)}</p>
                {href ? (
                  <Link
                    to={withLocale(href, props.locale)}
                    onClick={() => setLanguage(props.locale)}
                    data-qa={`buna-service-${i}`}
                    className="buna3-text-link"
                  >
                    {chrome.t("bookThis")} <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </div>
              <div className="buna3-service-fact">
                <Clock3 aria-hidden="true" />
                <span>
                  {chrome.t("minutes", {
                    count: durationMinutes(item.durationMinutes) || 0,
                  })}
                </span>
              </div>
              {props.snapshot.booking?.showPrices !== false ? (
                <div className="buna3-service-fact">
                  <Tag aria-hidden="true" />
                  <span>
                    {formatPrice(item.price, item.currency, props.locale)}
                  </span>
                </div>
              ) : null}
              <p className="buna3-service-note buna3-note">{t("private")}</p>
            </article>
          );
        })}
      </div>
      <div className="buna3-process">
        <h3>{t("process")}</h3>
        <ol>
          {[CalendarDays, Coffee, Users].map((Icon, i) => (
            <li key={i}>
              <Icon aria-hidden="true" />
              <span>{t(`step${i + 1}`)}</span>
            </li>
          ))}
        </ol>
      </div>
      {planning && serviceHref(props, planning, bookingPath) ? (
        <Link
          className="buna3-planning"
          data-qa="buna-service-3"
          to={withLocale(
            serviceHref(props, planning, bookingPath)!,
            props.locale,
          )}
          onClick={() => setLanguage(props.locale)}
        >
          {t("planning")} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </section>
  );
}
