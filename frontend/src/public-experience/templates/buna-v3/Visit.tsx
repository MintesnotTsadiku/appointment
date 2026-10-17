import { useState } from "react";
import { MapPin } from "lucide-react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { action, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { openState, useTimeOfDay } from "../kit";
import { Photo, words } from "./elements";
import { SectionHead } from "./Story";
import { useBunaCopy } from "./copy";

export function Visit({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const t = useBunaCopy(props.locale);
  const [habesha, setHabesha] = useState(props.locale === "am");
  const now = useTimeOfDay();
  const locations = section(props.snapshot.sections, "locations");
  const place = records(locations.items)[0];
  if (!place) return null;
  const days =
    typeof place.id === "string"
      ? props.snapshot.placeHours?.[place.id]?.days || []
      : [];
  const state = openState(days, now);
  const direction = action(place.directionsAction, props.locale);
  const clock = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return habesha ? habeshaLabel(hour, minute, props.locale) : value;
  };
  return (
    <section
      id="visit"
      className="buna3-section buna3-visit"
      data-reveal="rise"
    >
      <SectionHead
        number="05"
        title={words(locations.title, props.locale)}
        note={t("visitNote")}
      />
      <div className="buna3-visit-grid">
        <Photo props={props} role="studio.buna" decorative />
        <div className="buna3-address">
          <MapPin aria-hidden="true" />
          <h3>{words(place.name, props.locale)}</h3>
          <p>{words(place.address, props.locale)}</p>
          <p>{t("addressNote")}</p>
          {direction ? (
            <a className="buna3-text-link" href={direction.href}>
              {direction.label} →
            </a>
          ) : null}
        </div>
        <div className="buna3-city">
          <Photo props={props} role="addis.buna" decorative />
          <p>{t("city")}</p>
        </div>
        <div className="buna3-hours">
          <h3>{chrome.t("hours")}</h3>
          <button
            className="buna3-clock"
            aria-pressed={habesha}
            onClick={() => setHabesha(!habesha)}
          >
            {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
          </button>
          {state.open ? (
            <p>{chrome.t("openNow", { time: clock(state.closes || "") })}</p>
          ) : null}
          <dl>
            {days.map((day, i) => (
              <div key={i}>
                <dt>
                  {new Intl.DateTimeFormat(
                    props.locale === "am" ? "am-ET" : "en-GB",
                    { weekday: "short", timeZone: "UTC" },
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
                  {clock(day.open)}–{clock(day.close)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="buna3-note">{t("quote")}</p>
        </div>
      </div>
    </section>
  );
}
