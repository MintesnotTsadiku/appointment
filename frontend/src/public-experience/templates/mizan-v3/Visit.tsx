import { useState } from "react";
import { Clock3, MapPin } from "lucide-react";
import { habeshaLabel } from "@/lib/time";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { openState, useTimeOfDay } from "../kit";
import { usePublicChrome } from "../chrome";
import { Photo, words } from "./elements";
import { useMizanCopy } from "./copy";

export function Visit({ props }: { props: Props }) {
  const t = useMizanCopy(props.locale);
  const now = useTimeOfDay();
  const chrome = usePublicChrome(props.locale);
  const [habesha, setHabesha] = useState(props.locale === "am");
  const content = section(props.snapshot.sections, "locations");
  const place = records(content.items)[0];
  const faq = section(props.snapshot.sections, "faq");
  if (!place) return null;
  const address = words(place.address, props.locale);
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(words(place.address, "en"))}`;
  const days =
    typeof place.id === "string"
      ? props.snapshot.placeHours?.[place.id]?.days || []
      : [];
  const clock = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return habesha ? habeshaLabel(h, m, props.locale) : value;
  };
  const dayName = (day: string) =>
    new Intl.DateTimeFormat(props.locale === "am" ? "am-ET" : "en-GB", {
      weekday: "short",
      timeZone: "UTC",
    }).format(
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
            ].indexOf(day),
        ),
      ),
    );
  const state = openState(days, now);
  const sameHours =
    days.length > 0 &&
    days.every(
      (day) => day.open === days[0].open && day.close === days[0].close,
    );
  return (
    <section id="visit" className="mizan3-section mizan3-visit">
      <div>
        <p className="mizan3-eyebrow">{chrome.t("visit")}</p>
        <h2>{words(content.title, props.locale)}</h2>
        <p>{address}</p>
        <p>{words(place.body, props.locale)}</p>
        <details className="mizan3-faq" id="faq">
          <summary>{words(faq.title, props.locale)}</summary>
          {records(faq.items).map((item, i) => (
            <div key={i}>
              <h3>{words(item.question, props.locale)}</h3>
              <p>{words(item.answer, props.locale)}</p>
            </div>
          ))}
        </details>
      </div>
      <div className="mizan3-map">
        <svg
          viewBox="0 0 500 360"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="mizan-blocks"
              width="84"
              height="65"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-16)"
            >
              <rect width="84" height="65" fill="var(--map-land)" />
              <path
                d="M2 2h72v53H2Z"
                fill="var(--map-block)"
                stroke="var(--map-road)"
                strokeWidth="4"
              />
              <path
                d="M20 7v40m25-40v40"
                stroke="var(--map-land)"
                strokeWidth="3"
              />
            </pattern>
          </defs>
          <rect width="500" height="360" fill="url(#mizan-blocks)" />
          <path
            d="M-30 310 170 190 290 140 510 20M80-10 180 150 310 370"
            stroke="var(--map-road)"
            strokeWidth="24"
            fill="none"
          />
          <path
            d="M-30 310 170 190 290 140 510 20"
            stroke="var(--map-route)"
            strokeWidth="5"
            fill="none"
          />
          <path d="m330 230 95-30 55 80-105 30Z" fill="var(--map-park)" />
        </svg>
        <div className="mizan3-map-card">
          <MapPin aria-hidden="true" />
          <div>
            <strong>{props.applicationName}</strong>
            <span>{address}</span>
          </div>
        </div>
        <small>{t("locationGuide")}</small>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="mizan3-map-link"
        >
          {t("getDirections")} <span aria-hidden="true">→</span>
        </a>
      </div>
      <div className="mizan3-visit-details">
        <div className="mizan3-detail">
          <Clock3 aria-hidden="true" />
          <div>
            <h3>{t("openingHours")}</h3>
            {state.open && (
              <p>{chrome.t("openNow", { time: clock(state.closes || "") })}</p>
            )}
            {sameHours ? (
              <p>
                {dayName(days[0].day)} – {dayName(days[days.length - 1].day)}
                <br />
                {clock(days[0].open)} – {clock(days[0].close)}
              </p>
            ) : (
              days.map((day) => (
                <p key={day.day}>
                  {dayName(day.day)} {clock(day.open)} – {clock(day.close)}
                </p>
              ))
            )}
            <button
              className="mizan3-clock"
              type="button"
              aria-pressed={habesha}
              onClick={() => setHabesha(!habesha)}
            >
              {chrome.t(habesha ? "habeshaTime" : "internationalTime")}
            </button>
          </div>
        </div>
        <div className="mizan3-detail">
          <MapPin aria-hidden="true" />
          <div>
            <h3>{t("convenientLocation")}</h3>
            <p>{address}</p>
          </div>
        </div>
        <div className="mizan3-workshop">
          <Photo props={props} role="workshop.mizan" item={place} />
        </div>
      </div>
    </section>
  );
}
