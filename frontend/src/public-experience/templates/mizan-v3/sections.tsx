import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Photo, words } from "./elements";
import { useMizanCopy } from "./copy";
export { Visit } from "./Visit";

export function About({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "about");
  const people = records(section(props.snapshot.sections, "providers").items);
  const t = useMizanCopy(props.locale);
  return (
    <section id="about" className="mizan3-section mizan3-team">
      <div>
        <p className="mizan3-eyebrow">{t("theTeam")}</p>
        <h2>{words(content.title, props.locale)}</h2>
        <p>{words(content.body, props.locale)}</p>
        <a className="mizan3-text-link" href="#approach">
          {t("meetApproach")} <span aria-hidden="true">→</span>
        </a>
      </div>
      {people.slice(0, 2).map((person, i) => (
        <figure key={String(person.id || i)} data-reveal="report">
          <Photo
            props={props}
            role={i === 0 ? "lead.mizan" : "specialist.mizan"}
            item={person}
          />
          <figcaption>
            <strong>{words(person.name, props.locale)}</strong>
            <span>{words(person.role, props.locale)}</span>
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
