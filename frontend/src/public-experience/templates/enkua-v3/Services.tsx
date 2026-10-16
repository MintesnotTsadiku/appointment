import { Link } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import {
  action,
  durationMinutes,
  formatPrice,
  records,
  section,
} from "../content";
import { usePublicChrome } from "../chrome";
import { Photo, words, withLocale } from "./elements";

export const roles = ["scene1.enkua", "scene2.enkua", "portrait.enkua"];

export function Services({
  props,
  bookingPath,
}: {
  props: Props;
  bookingPath?: string | null;
}) {
  const chrome = usePublicChrome(props.locale);
  const sectionData = section(props.snapshot.sections, "services");
  return (
    <section id="services" className="enkua3-section enkua3-services">
      <div className="enkua3-section-head">
        <span className="enkua3-index" aria-hidden="true">
          01 /
        </span>
        <h2>{words(sectionData.title, props.locale)}</h2>
        <p>{words(sectionData.intro, props.locale)}</p>
      </div>
      <div className="enkua3-service-list">
        {records(sectionData.items).map((item, index) => {
          const href =
            (typeof item.id === "string" &&
              props.snapshot.bookingPaths?.[item.id]) ||
            action(item.action, props.locale)?.href ||
            bookingPath;
          return (
            <article
              className="enkua3-service"
              key={String(item.id || index)}
              data-reveal="rise"
            >
              <div className="enkua3-service-photo">
                <Photo
                  props={props}
                  role={roles[index % roles.length]}
                  item={item}
                  decorative
                />
              </div>
              <div className="enkua3-service-copy">
                <span className="enkua3-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{words(item.name, props.locale)}</h3>
                <p>{words(item.summary, props.locale)}</p>
                <div className="enkua3-service-meta">
                  <span>
                    {chrome.t("minutes", {
                      count: durationMinutes(item.durationMinutes) || 0,
                    })}
                  </span>
                  {props.snapshot.booking?.showPrices !== false ? (
                    <strong>
                      {formatPrice(item.price, item.currency, props.locale)}
                    </strong>
                  ) : null}
                </div>
                {href ? (
                  <Link
                    className="enkua3-text-link"
                    to={withLocale(href, props.locale)}
                    data-qa={`enkua-service-${index}`}
                  >
                    {chrome.t("bookThis")} <span aria-hidden="true">↗</span>
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
