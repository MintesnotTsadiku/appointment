import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Book, Live, Photo, words } from "./elements";
import { useEnkuaCopy } from "./copy";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  const t = useEnkuaCopy(props.locale);
  return (
    <section className="enkua3-hero">
      <div className="enkua3-hero-copy">
        <h1>
          {words(hero.title, props.locale)
            .split("\n")
            .map((line, index) => (
              <span key={index}>
                {line.replace(/[.።]$/, "")}
                <b>{line.match(/[.።]$/)?.[0]}</b>
              </span>
            ))}
        </h1>
        <p className="enkua3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
        <p className="enkua3-scribble enkua3-hero-note">
          {t("differentStories")}
        </p>
      </div>
      <div className="enkua3-sun" aria-hidden="true" />
      <div className="enkua3-hero-person">
        <Photo props={props} role="hero.enkua" item={hero} eager />
      </div>
      <div className="enkua3-made">
        <strong>{t("madeInAddis")}</strong>
        <p>{t("realPeople")}</p>
      </div>
      <div className="enkua3-hero-secondary">
        <Photo props={props} role="founder.enkua" />
        <span className="enkua3-scribble">{t("sameCity")}</span>
      </div>
    </section>
  );
}

export function Gallery({ props }: { props: Props }) {
  const gallery = section(props.snapshot.sections, "gallery");
  const items = records(gallery.items);
  const t = useEnkuaCopy(props.locale);
  if (!items.length) return null;
  return (
    <section id="work" className="enkua3-gallery">
      <p className="enkua3-ribbon">{t("categories")}</p>
      <div className="enkua3-section-head">
        <h2>{words(gallery.title, props.locale)}</h2>
        <p className="enkua3-mono">{words(gallery.intro, props.locale)}</p>
      </div>
      <div className="enkua3-mosaic">
        {items.map((item, index) => (
          <figure key={index} data-reveal="portfolio">
            <Photo props={props} role="graduation.enkua" item={item} />
            <figcaption>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{words(item.caption, props.locale)}</span>
            </figcaption>
            {index === 0 && (
              <span className="enkua3-scribble">{t("sameDreams")}</span>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
