import { Link } from "react-router-dom";
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
import { words, withLocale } from "./elements";
import { Field } from "./Notebook";
import { useHanaCopy } from "./copy";

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
  const t = useHanaCopy(props.locale);
  const content = section(props.snapshot.sections, "services");
  return (
    <Field
      props={props}
      number="03"
      title={words(content.title, props.locale)}
      note={t("serviceNote")}
      id="services"
    >
      <div className="hana3-service-list">
        {records(content.items).map((item, index) => {
          const href = serviceHref(props, item, bookingPath);
          return (
            <article className="hana3-service" key={String(item.id || index)}>
              <span className="hana3-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="hana3-service-copy">
                <h3>{words(item.name, props.locale)}</h3>
                <p>{words(item.summary, props.locale)}</p>
              </div>
              <span className="hana3-duration">
                {chrome.t("minutes", {
                  count: durationMinutes(item.durationMinutes) || 0,
                })}
              </span>
              {props.snapshot.booking?.showPrices !== false ? (
                <strong className="hana3-price">
                  {formatPrice(item.price, item.currency, props.locale)}
                </strong>
              ) : null}
              {href ? (
                <Link
                  className="hana3-button"
                  to={withLocale(href, props.locale)}
                  data-qa={`hana-service-${index}`}
                  aria-label={`${t("select")}: ${words(item.name, props.locale)}`}
                >
                  {t("select")}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </Field>
  );
}
