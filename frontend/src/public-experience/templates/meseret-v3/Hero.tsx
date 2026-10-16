import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="meseret3-hero meseret3-daybreak">
      <div className="meseret3-hero-copy">
        <p className="meseret3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="meseret3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="meseret3-hero-image">
        <Photo props={props} role="hero.meseret" item={hero} eager />
      </div>
    </section>
  );
}
