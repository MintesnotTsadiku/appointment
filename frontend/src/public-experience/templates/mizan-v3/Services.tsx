import { Link } from "react-router-dom";
import { useTranslation } from "@/lib/i18n";
import type { TemplateProps as Props } from "../types";
import {
  action,
  durationMinutes,
  formatPrice,
  records,
  section,
} from "../content";
import { usePublicChrome } from "../chrome";
import { words, withLocale } from "./elements";

export function Services({
  props,
  bookingPath,
}: {
  props: Props;
  bookingPath?: string | null;
}) {
  const chrome = usePublicChrome(props.locale);
  const { setLanguage } = useTranslation();
  const content = section(props.snapshot.sections, "services");
  const items = records(content.items);
  return (
    <section id="services" className="mizan3-section mizan3-services">
      <h2 className="mizan3-eyebrow">{words(content.title, props.locale)}</h2>
      <div className="mizan3-service-list">
        {items.slice(0, 3).map((item, index) => {
          const href =
            (typeof item.id === "string" &&
              props.snapshot.bookingPaths?.[item.id]) ||
            action(item.action, props.locale)?.href ||
            bookingPath;
          return (
            <article className="mizan3-service" key={String(item.id || index)}>
              <span className="mizan3-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>
                {href ? (
                  <Link
                    to={withLocale(href, props.locale)}
                    onClick={() => setLanguage(props.locale)}
                    data-qa={`mizan-service-${index}`}
                  >
                    {words(item.name, props.locale)}{" "}
                    <span className="mizan3-service-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                ) : (
                  words(item.name, props.locale)
                )}
              </h3>
              <p className="mizan3-service-meta">
                {chrome.t("minutes", {
                  count: durationMinutes(item.durationMinutes) || 0,
                })}
                {props.snapshot.booking?.showPrices !== false && (
                  <> — {formatPrice(item.price, item.currency, props.locale)}</>
                )}
              </p>
              <p>{words(item.summary, props.locale)}</p>
            </article>
          );
        })}
      </div>
      {items.slice(3).map((item, i) => {
        const href =
          typeof item.id === "string" && props.snapshot.bookingPaths?.[item.id];
        return href ? (
          <Link
            key={String(item.id)}
            className="mizan3-extra-service"
            to={withLocale(href, props.locale)}
            onClick={() => setLanguage(props.locale)}
            data-qa={`mizan-service-${i + 3}`}
          >
            {words(item.name, props.locale)} ·{" "}
            {chrome.t("minutes", {
              count: durationMinutes(item.durationMinutes) || 0,
            })}{" "}
            <span aria-hidden="true">→</span>
          </Link>
        ) : null;
      })}
    </section>
  );
}
