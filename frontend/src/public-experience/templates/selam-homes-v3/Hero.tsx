import { roles } from "./Services";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="selamhomes3-hero selamhomes3-living">
      <div className="selamhomes3-hero-copy">
        <p className="selamhomes3-eyebrow">
          {words(hero.eyebrow, props.locale)}
        </p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="selamhomes3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="selamhomes3-hero-image">
        <Photo props={props} role="hero.selam-homes" item={hero} eager />
      </div>
    </section>
  );
}

export function Gallery({ props }: { props: Props }) {
  const gallery = section(props.snapshot.sections, "gallery");
  const items = records(gallery.items);
  if (!items.length) return null;
  return (
    <section className="selamhomes3-section selamhomes3-gallery">
      <div className="selamhomes3-section-head">
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
