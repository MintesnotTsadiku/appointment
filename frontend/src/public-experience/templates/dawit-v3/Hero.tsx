import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="dawit3-hero">
      <div className="dawit3-masthead">
        <p className="dawit3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{props.applicationName}</h1>
      </div>
      <div className="dawit3-journal">
        <div>
          <span className="dawit3-index" aria-hidden="true">
            01 —
          </span>
          <h2>{words(hero.title, props.locale)}</h2>
          <p>{words(hero.subtitle, props.locale)}</p>
        </div>
        <div className="dawit3-hero-image">
          <Photo props={props} role="hero.dawit" item={hero} eager />
        </div>
        <div>
          <p className="dawit3-lead">
            {words(
              section(props.snapshot.sections, "about").body,
              props.locale,
            )}
          </p>
          <Book props={props} />
          <Live props={props} />
        </div>
      </div>
    </section>
  );
}
