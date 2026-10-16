import { useState } from "react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { openState, useTimeOfDay } from "../kit";
import { Photo, words } from "./elements";
export { Reservation as Process } from "./Reservation";

export function About({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "about");
  return (
    <section className="meseret3-prepare" id="prepare">
      <div>
        <h2>{words(content.title, props.locale)}</h2>
        <p>{words(content.body, props.locale)}</p>
        <ul>
          {Array.isArray(content.highlights)
            ? content.highlights.map((item, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  {words(item, props.locale)}
                </li>
              ))
            : null}
        </ul>
      </div>
      <Photo props={props} role="prepare.meseret" decorative />
    </section>
  );
}

export function Visit({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const [habesha, setHabesha] = useState(props.locale === "am");
  const now = useTimeOfDay();
  const clock = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return habesha ? habeshaLabel(hour, minute, props.locale) : value;
  };
  const places = section(props.snapshot.sections, "locations");
  return (
    <section id="visit" className="meseret3-section meseret3-visit">
      <div className="meseret3-section-head">
        <h2>{words(places.title, props.locale)}</h2>
        <button
          type="button"
          className="meseret3-clock"
          aria-pressed={habesha}
          onClick={() => setHabesha(!habesha)}
        >
          {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
        </button>
      </div>
      <div className="meseret3-places">
        {[...records(places.items)].reverse().map((place, index) => {
          const days =
            typeof place.id === "string"
              ? props.snapshot.placeHours?.[place.id]?.days || []
              : [];
          const state = openState(days, now);
          return (
            <article key={index}>
              <Photo
                props={props}
                role={index === 0 ? "online.meseret" : "office.meseret"}
                decorative
              />
              <div className="meseret3-place-caption">
                <p>
                  {state.open
                    ? chrome.t("openNow", { time: clock(state.closes || "") })
                    : ""}
                </p>
                <h3>{words(place.name, props.locale)}</h3>
                <p>{words(place.address, props.locale)}</p>
                <p>{words(place.body, props.locale)}</p>
                {days.length ? (
                  <details className="meseret3-hours-disclosure">
                    <summary>{chrome.t("hours")}</summary>
                    <dl className="meseret3-hours">
                      {days.map((day, i) => (
                        <div key={i}>
                          <dt>
                            {new Intl.DateTimeFormat(
                              props.locale === "am" ? "am-ET" : "en-GB",
                              { weekday: "long", timeZone: "UTC" },
                            ).format(
                              new Date(
                                Date.UTC(
                                  2024,
                                  0,
                                  1 +
                                    [
                                      "Monday",
                                      "Tuesday",
                                      "Wednesday",
                                      "Thursday",
                                      "Friday",
                                      "Saturday",
                                      "Sunday",
                                    ].indexOf(day.day),
                                ),
                              ),
                            )}
                          </dt>
                          <dd>
                            {clock(day.open)} – {clock(day.close)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : (
                  <p>{words(place.hours, props.locale)}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
