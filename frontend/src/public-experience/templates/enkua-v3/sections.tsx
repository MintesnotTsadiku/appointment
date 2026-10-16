import { useState } from "react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { openState, useTimeOfDay } from "../kit";
import { Photo, words } from "./elements";
import { useEnkuaCopy } from "./copy";

export function About({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "about");
  const people = records(section(props.snapshot.sections, "providers").items);
  const highlights = Array.isArray(content.highlights)
    ? content.highlights
    : [];
  const t = useEnkuaCopy(props.locale);
  return (
    <section className="enkua3-about" id="about">
      <div className="enkua3-working">
        <Photo props={props} role="working.enkua" item={content} />
        <svg
          className="enkua3-big-arrow"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path d="M25 0 100 50 25 100 5 75 50 50 5 25Z" fill="currentColor" />
        </svg>
        <span className="enkua3-scribble">{t("goodFrames")}</span>
      </div>
      <div className="enkua3-about-copy">
        <h2>{words(content.title, props.locale)}</h2>
        {people.map((person, index) => (
          <p className="enkua3-mono" key={index}>
            {words(person.name, props.locale)} /<br />
            {words(person.role, props.locale)}
          </p>
        ))}
        <p>{words(content.body, props.locale)}</p>
        <span className="enkua3-scribble">{t("peopleFuel")}</span>
        {highlights.length > 0 && (
          <figure className="enkua3-producer">
            <Photo props={props} role="hero.enkua" />
            <figcaption className="enkua3-mono">
              {highlights.map((line, i) => (
                <span key={i}>{words(line, props.locale)}</span>
              ))}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

export function Visit({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "locations");
  const places = records(content.items);
  const t = useEnkuaCopy(props.locale);
  return (
    <section id="visit" className="enkua3-visit">
      <div className="enkua3-studio-copy">
        <h2>{words(content.title, props.locale)}</h2>
        <p>{words(content.intro, props.locale)}</p>
        <a className="enkua3-text-link" href="#enkua-hours">
          {t("seeStudio")} ↗
        </a>
      </div>
      <div className="enkua3-studio-photo">
        <Photo props={props} role="studio.enkua" item={places[0]} />
      </div>
      <div className="enkua3-city-photo">
        <Photo props={props} role="city.enkua" />
        <span className="enkua3-scribble">{t("moreAngles")}</span>
      </div>
      <details className="enkua3-visit-details" id="enkua-hours">
        <summary>{t("hoursAndDetails")}</summary>
        <Hours props={props} />
      </details>
    </section>
  );
}

function Hours({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const [habesha, setHabesha] = useState(props.locale === "am");
  const now = useTimeOfDay();
  const clock = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return habesha ? habeshaLabel(hour, minute, props.locale) : value;
  };
  return (
    <div className="enkua3-hours">
      <button
        type="button"
        aria-pressed={habesha}
        onClick={() => setHabesha(!habesha)}
      >
        {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
      </button>
      <div>
        {records(section(props.snapshot.sections, "locations").items).map(
          (place, index) => {
            const days =
              typeof place.id === "string"
                ? props.snapshot.placeHours?.[place.id]?.days || []
                : [];
            const state = openState(days, now);
            return (
              <article key={index}>
                <h3>{words(place.name, props.locale)}</h3>
                <p>{words(place.address, props.locale)}</p>
                <p>{words(place.body, props.locale)}</p>
                {state.open && (
                  <p>
                    {chrome.t("openNow", { time: clock(state.closes || "") })}
                  </p>
                )}
                <dl>
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
              </article>
            );
          },
        )}
      </div>
    </div>
  );
}
