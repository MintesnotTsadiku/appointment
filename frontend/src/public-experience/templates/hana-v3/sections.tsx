import { useState } from "react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { openState, useTimeOfDay } from "../kit";
import { words } from "./elements";

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
    <section className="hana3-section hana3-visit">
      <div className="hana3-section-head">
        <h2>{words(places.title, props.locale)}</h2>
        <button
          type="button"
          className="hana3-clock"
          aria-pressed={habesha}
          onClick={() => setHabesha(!habesha)}
        >
          {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
        </button>
      </div>
      <div className="hana3-places">
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
                <dl className="hana3-hours">
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
