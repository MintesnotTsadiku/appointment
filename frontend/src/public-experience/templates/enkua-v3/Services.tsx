import { useTranslation } from "@/lib/i18n";
import { Link } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import { action, durationMinutes, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { useEnkuaCopy } from "./copy";
import { Photo, words, withLocale } from "./elements";

export const roles = ["hero.enkua", "founder.enkua", "products.enkua"];

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
  const t = useEnkuaCopy(props.locale);
  return (
    <section id="services" className="enkua3-services">
      <div className="enkua3-section-head">
        <h2>{words(content.title, props.locale)}</h2>
        <p className="enkua3-mono">{words(content.intro, props.locale)}</p>
      </div>
      <div className="enkua3-service-list">
        {items.slice(0, 3).map((item, index) => {
          const href =
            (typeof item.id === "string" &&
              props.snapshot.bookingPaths?.[item.id]) ||
            action(item.action, props.locale)?.href ||
            bookingPath;
          return (
            <article className="enkua3-service" key={String(item.id || index)}>
              <span className="enkua3-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{words(item.name, props.locale)}</h3>
              <span className="enkua3-duration">
                {chrome.t("minutes", {
                  count: durationMinutes(item.durationMinutes) || 0,
                })}
              </span>
              {props.snapshot.booking?.showPrices !== false && (
                <strong className="enkua3-price">
                  <span>{String(item.currency || "ETB")}</span>{" "}
                  <b>
                    {new Intl.NumberFormat(
                      props.locale === "am" ? "am-ET" : "en-ET",
                    ).format(Number(item.price) || 0)}
                  </b>
                </strong>
              )}
              {href && (
                <Link
                  className="enkua3-service-book"
                  to={withLocale(href, props.locale)}
                  onClick={() => setLanguage(props.locale)}
                  data-qa={`enkua-service-${index}`}
                  aria-label={`${chrome.t("bookThis")}: ${words(item.name, props.locale)}`}
                >
                  {t("bookShort")} ↗
                </Link>
              )}
              <div className="enkua3-service-photo">
                <Photo
                  props={props}
                  role={roles[index % roles.length]}
                  item={item}
                  decorative
                />
              </div>
            </article>
          );
        })}
      </div>
      {items.length > 3 && (
        <div className="enkua3-extra-services">
          {items.slice(3).map((item, index) => {
            const href =
              (typeof item.id === "string" &&
                props.snapshot.bookingPaths?.[item.id]) ||
              action(item.action, props.locale)?.href ||
              bookingPath;
            return href ? (
              <Link
                key={String(item.id)}
                to={withLocale(href, props.locale)}
                  onClick={() => setLanguage(props.locale)}
                data-qa={`enkua-service-${index + 3}`}
              >
                {words(item.name, props.locale)} ·{" "}
                {chrome.t("minutes", {
                  count: durationMinutes(item.durationMinutes) || 0,
                })}{" "}
                ↗
              </Link>
            ) : null;
          })}
        </div>
      )}
    </section>
  );
}
