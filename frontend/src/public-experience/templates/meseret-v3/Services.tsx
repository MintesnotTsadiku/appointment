import { useTranslation } from "@/lib/i18n";
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

export const roles = [
  "bookkeeping.meseret",
  "beginning.meseret",
  "advisers.meseret",
];

export function Services({
  props,
  bookingPath,
}: {
  props: Props;
  bookingPath?: string | null;
}) {
  const { setLanguage } = useTranslation();
  const chrome = usePublicChrome(props.locale);
  const sectionData = section(props.snapshot.sections, "services");
  const stories = records(section(props.snapshot.sections, "process").items);
  const providers = records(
    section(props.snapshot.sections, "providers").items,
  );
  return (
    <section id="services" className="meseret3-section meseret3-services">
      <div className="meseret3-service-list">
        {records(sectionData.items).map((item, index) => {
          const href =
            (typeof item.id === "string" &&
              props.snapshot.bookingPaths?.[item.id]) ||
            action(item.action, props.locale)?.href ||
            bookingPath;
          return (
            <article
              className={`meseret3-service meseret3-scene-${index}`}
              id={index === 2 ? "about" : undefined}
              key={String(item.id || index)}
              data-reveal="rise"
            >
              <div className="meseret3-service-photo">
                <Photo
                  props={props}
                  role={roles[index % roles.length]}
                  item={item}
                  decorative
                />
              </div>
              <div className="meseret3-service-copy">
                <span className="meseret3-number" aria-hidden="true">
                  {["09:00", "12:00", "16:00"][index]}
                </span>
                <h2>
                  {words(stories[index]?.title || item.name, props.locale)}
                </h2>
                <p>
                  {words(
                    stories[index]?.description || item.summary,
                    props.locale,
                  )}
                </p>
                <h3>{words(item.name, props.locale)}</h3>
                <div className="meseret3-service-meta">
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
                    className="meseret3-text-link"
                    to={withLocale(href, props.locale)}
                    data-qa={`meseret-service-${index}`}
                    onClick={() => setLanguage(props.locale)}
                  >
                    {chrome.t("bookThis")} <span aria-hidden="true">↗</span>
                  </Link>
                ) : null}
              </div>
              {index === 2 ? (
                <div className="meseret3-advisers">
                  {providers.map((person, i) => (
                    <div key={i}>
                      <strong>{words(person.name, props.locale)}</strong>
                      <span>{words(person.role, props.locale)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
