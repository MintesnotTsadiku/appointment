import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Book, Live, Photo, words } from "./elements";
import { useMizanCopy } from "./copy";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  const person = records(
    section(props.snapshot.sections, "providers").items,
  )[0];
  const t = useMizanCopy(props.locale);
  return (
    <section className="mizan3-hero">
      <div className="mizan3-hero-copy">
        <p className="mizan3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>
          {words(hero.title, props.locale)
            .split("\n")
            .map((line, i) => (
              <span key={i}>{line}</span>
            ))}
        </h1>
        <p className="mizan3-lead">{words(hero.body, props.locale)}</p>
        {props.locale === "en" && (
          <p className="mizan3-am-line" lang="am">
            {t("amharicMotto")}
          </p>
        )}
        <p className="mizan3-hero-description">
          {words(hero.subtitle, props.locale)}
        </p>
        <div className="mizan3-hero-actions">
          <Book props={props} />
          <a className="mizan3-text-link" href="#approach">
            {t("ourApproach")} <span aria-hidden="true">→</span>
          </a>
        </div>
        <Live props={props} />
      </div>
      <figure className="mizan3-hero-image">
        <Photo props={props} role="hero.mizan" item={hero} eager />
        <figcaption>
          <strong>{words(person?.name, props.locale)}</strong>
          <span>{words(person?.role, props.locale)}</span>
        </figcaption>
      </figure>
      <aside className="mizan3-diagnostics" aria-label={t("inspectionDetails")}>
        <Photo props={props} role="screen.mizan" decorative />
        <p>{t("realData")}</p>
        <Photo props={props} role="brake.mizan" decorative />
        <Photo props={props} role="engine.mizan" decorative />
        <p>{t("inspectDiagnose")}</p>
      </aside>
    </section>
  );
}
