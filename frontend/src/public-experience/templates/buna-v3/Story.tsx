import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Photo, words } from "./elements";
import { useBunaCopy } from "./copy";

export function SectionHead({
  number,
  title,
  note,
}: {
  number?: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="buna3-section-head">
      <h2>
        {number ? (
          <span className="buna3-stop" aria-hidden="true">
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      {note ? <p className="buna3-note">{note}</p> : null}
    </div>
  );
}

export function People({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "about");
  const people = records(section(props.snapshot.sections, "providers").items);
  return (
    <section
      id="about"
      className="buna3-section buna3-people"
      data-reveal="rise"
    >
      <SectionHead
        number="01"
        title={words(content.title, props.locale)}
        note={words(content.body, props.locale)}
      />
      <div className="buna3-people-scene">
        <Photo props={props} role="people.buna" decorative />
        {people.map((person, i) => (
          <article key={i} className={`buna3-person buna3-person-${i}`}>
            <h3>{words(person.name, props.locale)}</h3>
            <p>{words(person.role, props.locale)}</p>
            {Array.isArray(person.specialties)
              ? person.specialties.map((value, j) => (
                  <p key={j} className="buna3-person-bio">
                    {words(value, props.locale)}
                  </p>
                ))
              : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function Bean({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "process");
  const t = useBunaCopy(props.locale);
  return (
    <section id="bean" className="buna3-section buna3-bean" data-reveal="rise">
      <SectionHead
        number="02"
        title={words(content.title, props.locale)}
        note={t("beanNote")}
      />
      <div className="buna3-bean-layout">
        <div className="buna3-bean-stages">
          {records(content.items).map((item, i) => (
            <figure key={i}>
              <Photo
                props={props}
                role={`${["cherry", "green", "roasted", "cup"][i]}.buna`}
                decorative
              />
              <figcaption>
                <strong>{words(item.title, props.locale)}</strong>
                <span className="buna3-note">
                  {words(item.description, props.locale)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="buna3-pour">
          <Photo props={props} role="pour.buna" decorative />
          <p className="buna3-note">{t("pourNote")}</p>
        </div>
      </div>
    </section>
  );
}
