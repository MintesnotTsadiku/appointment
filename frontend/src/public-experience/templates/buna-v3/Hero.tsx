import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { Book, Live, Photo, words } from "./elements";
import { SiteHoliday } from "./holiday";
import { useBunaCopy } from "./copy";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  const chrome = usePublicChrome(props.locale);
  const t = useBunaCopy(props.locale);
  const now = useTimeOfDay();
  return (
    <section className="buna3-hero">
      <div className="buna3-terrain">
        <Photo props={props} role="hero.buna" item={hero} eager decorative />
      </div>
      <div className="buna3-origins" aria-label={t("originGuide")}>
        <svg
          className="buna3-map-route"
          viewBox="0 0 1000 700"
          aria-hidden="true"
        >
          <path d="M340 140C390 170 380 240 365 290S330 365 300 420S395 490 510 490" />
          <circle cx="340" cy="140" r="6" />
          <circle cx="365" cy="290" r="6" />
          <circle cx="300" cy="420" r="6" />
          <circle cx="510" cy="490" r="6" />
        </svg>
        {["addis", "yirgacheffe", "sidama", "guji"].map((key, i) => (
          <figure key={key} className={`buna3-origin buna3-origin-${i}`}>
            <Photo props={props} role={`${key}.buna`} decorative />
            <figcaption>{t(key)}</figcaption>
          </figure>
        ))}
        <span className="buna3-map-caption">{t("originGuide")}</span>
      </div>
      <div className="buna3-hero-copy">
        <h1 data-qa="buna-greeting">
          {chrome.t(greetingKey(now.part))},<br />
          {words(hero.eyebrow, props.locale)}
        </h1>
        <h2>{words(hero.title, props.locale)}</h2>
        <p className="buna3-note">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
        <SiteHoliday props={props} />
      </div>
      <p className="buna3-map-note buna3-note">{t("mapNote")}</p>
    </section>
  );
}
