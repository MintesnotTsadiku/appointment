import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Photo, words } from "./elements";
import { useHanaCopy } from "./copy";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  const t = useHanaCopy(props.locale);
  const title = words(hero.title, props.locale);
  const parts = title.split(/[,፣]\s*/);
  return (
    <section className="hana3-hero" id="top">
      <div className="hana3-hero-copy">
        <h1>
          {parts.length === 2 ? (
            <>
              <span>
                {parts[0]}
                {props.locale === "am" ? "፣" : ","}
              </span>
              <span>{parts[1]}</span>
            </>
          ) : (
            title
          )}
        </h1>
        <p className="hana3-lead">{words(hero.subtitle, props.locale)}</p>
        <a className="hana3-text-link" href="#field-notes">
          {t("follow")} ↓
        </a>
        <p className="hana3-location">
          <svg
            aria-hidden="true"
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M10 22S3 13 3 8a7 7 0 0 1 14 0c0 5-7 14-7 14Z" />
            <circle cx="10" cy="8" r="2.5" />
          </svg>
          {t("city")}
        </p>
      </div>
      <div className="hana3-collage">
        <svg className="hana3-map" viewBox="0 0 600 700" aria-hidden="true">
          <defs>
            <pattern
              id="hana-streets"
              width="83"
              height="73"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(19) scale(.5)"
            >
              <path d="M0 0H83V73H0Z M14 0V73M46 0V73M0 19H83M0 58H83M14 19L46 58M46 19L83 40" />
            </pattern>
          </defs>
          <path
            fill="url(#hana-streets)"
            d="M140 0L420 12 540 170 530 365 600 520 440 670 180 700 50 520 0 220Z"
          />
          <path d="M80 700Q390 400 170 70M0 290Q300 400 570 180M300 0Q180 420 600 580" />
        </svg>
        <svg
          className="hana3-photo-route"
          viewBox="0 0 600 700"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M430 80C430 120 485 100 485 180V260Q485 310 430 310L400 355 210 395 160 450V700" />
          <circle cx="430" cy="80" r="6" />
          <circle cx="430" cy="310" r="6" />
          <circle cx="210" cy="395" r="6" />
        </svg>
        <figure className="hana3-city">
          <Photo props={props} role="city.hana" eager decorative />
          <figcaption>01</figcaption>
        </figure>
        <figure className="hana3-coffee">
          <Photo props={props} role="coffee.hana" eager decorative />
          <figcaption>02</figcaption>
        </figure>
        <figure className="hana3-walking">
          <Photo props={props} role="hero.hana" eager decorative />
          <figcaption>03</figcaption>
        </figure>
        <p className="hana3-hand hana3-map-note">{t("mapNote")}</p>
        <p className="hana3-hand hana3-city-note">{t("city")}</p>
        <p className="hana3-hand hana3-walk-note">{t("walkingNote")}</p>
        <p className="hana3-collage-label">
          {words(hero.eyebrow, props.locale)}
        </p>
      </div>
    </section>
  );
}
