import { roles } from "./Services";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="enkua3-hero">
      <div className="enkua3-hero-copy">
        <p className="enkua3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="enkua3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="enkua3-hero-image">
        <span className="enkua3-cross" aria-hidden="true">
          ✳
        </span>
        <Photo props={props} role="hero.enkua" item={hero} eager />
      </div>
    </section>
  );
}

export function Gallery({ props }: { props: Props }) {
  const gallery = section(props.snapshot.sections, "gallery");
  const items = records(gallery.items);
  if (!items.length) return null;
  return (
    <section className="enkua3-section enkua3-gallery">
      <div className="enkua3-section-head">
        <h2>{words(gallery.title, props.locale)}</h2>
        <p>{words(gallery.intro, props.locale)}</p>
      </div>
      <div>
        {items.map((item, index) => (
          <figure key={index}>
            <Photo
              props={props}
              role={roles[index % roles.length]}
              item={item}
            />
            <figcaption>{words(item.caption, props.locale)}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
