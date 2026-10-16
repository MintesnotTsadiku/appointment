import { InspectionDiagram } from "./diagram";
import { useState } from "react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { openState, useTimeOfDay } from "../kit";
import { Book, Photo, words } from "./elements";

export function About({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "about");
  const providers = records(
    section(props.snapshot.sections, "providers").items,
  );
  return (
    <section className="mizan3-section mizan3-about" id="about">
      <div className="mizan3-about-image">
        <Photo props={props} role="portrait.mizan" item={providers[0]} />
      </div>
      <div>
        <span className="mizan3-index" aria-hidden="true">
          02 /
        </span>
        <h2>{words(content.title, props.locale)}</h2>
        <p className="mizan3-body">{words(content.body, props.locale)}</p>
        {providers.map((person, index) => (
          <div className="mizan3-person" key={index}>
            <h3>{words(person.name, props.locale)}</h3>
            <p>{words(person.role, props.locale)}</p>
          </div>
        ))}
        <Book props={props} />
      </div>
    </section>
  );
}

export function Process({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "process");
  return (
    <section className="mizan3-section mizan3-process">
      <InspectionDiagram />
      <h2>{words(content.title, props.locale)}</h2>
      <InspectionDiagram />
      <div>
        {records(content.items).map((item, index) => (
          <article key={index}>
            <span className="mizan3-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{words(item.title, props.locale)}</h3>
            <p>{words(item.description, props.locale)}</p>
          </article>
        ))}
      </div>
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
    <section id="visit" className="mizan3-section mizan3-visit">
      <div className="mizan3-section-head">
        <h2>{words(places.title, props.locale)}</h2>
        <button
          type="button"
          className="mizan3-clock"
          aria-pressed={habesha}
          onClick={() => setHabesha(!habesha)}
        >
          {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
        </button>
      </div>
      <div className="mizan3-places">
        {records(places.items).map((place, index) => {
          const days =
            typeof place.id === "string"
              ? props.snapshot.placeHours?.[place.id]?.days || []
              : [];
          const state = openState(days, now);
          return (
            <article key={index}>
              <p>
                {state.open
                  ? chrome.t("openNow", { time: clock(state.closes || "") })
                  : ""}
              </p>
              <h3>{words(place.name, props.locale)}</h3>
              <p>{words(place.address, props.locale)}</p>
              <p>{words(place.body, props.locale)}</p>
              {days.length ? (
                <dl className="mizan3-hours">
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
              ) : (
                <p>{words(place.hours, props.locale)}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
