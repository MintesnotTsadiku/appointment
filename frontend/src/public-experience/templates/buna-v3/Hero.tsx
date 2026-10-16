import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  return (
    <section className="buna3-hero">
      <div className="buna3-hero-copy">
        <p className="buna3-eyebrow">{words(hero.eyebrow, props.locale)}</p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="buna3-lead">{words(hero.subtitle, props.locale)}</p>
        <Book props={props} />
        <Live props={props} />
      </div>
      <div className="buna3-atlas">
        <div className="buna3-atlas-grid" aria-hidden="true">
          <svg viewBox="0 0 500 500">
            <path d="M140 60L230 30 290 110 340 120 385 170 470 170 380 285 310 310 260 390 160 360 110 290 40 230 75 160Z" />
            <path
              className="buna3-atlas-route"
              d="M120 240Q240 160 240 250T270 330"
            />
            {[
              [120, 240],
              [240, 250],
              [270, 330],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="16" />
                <text x={x} y={y + 5} textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="buna3-origin-photo">
          <Photo props={props} role="hero.buna" item={hero} eager />
        </div>
        <span className="buna3-coordinate" aria-hidden="true">
          09° N / 38° E
        </span>
      </div>
    </section>
  );
}
