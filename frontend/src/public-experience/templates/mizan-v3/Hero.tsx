import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="mizan3-hero">
      <div className="mizan3-hero-copy">
        <p className="mizan3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="mizan3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="mizan3-hero-image">
        <Photo props={props} role="hero.mizan" item={hero} eager />
      </div>
    </section>
  );
}
