import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="hana3-hero">
      <div className="hana3-hero-copy">
        <p className="hana3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="hana3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="hana3-hero-image">
        <span className="hana3-coordinate" aria-hidden="true">
          09°01′ N / 38°45′ E
        </span>
        <Photo props={props} role="hero.hana" item={hero} eager />
        <div className="hana3-inset">
          <Photo props={props} role="scene2.hana" decorative />
        </div>
      </div>
    </section>
  );
}
