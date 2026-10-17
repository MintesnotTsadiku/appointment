import type { ReactNode } from "react";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Photo, words } from "./elements";
import { useHanaCopy } from "./copy";

export function Field({
  props,
  number,
  title,
  note,
  id,
  children,
}: {
  props: Props;
  number: string;
  title?: string;
  note?: string;
  id: string;
  children: ReactNode;
}) {
  const t = useHanaCopy(props.locale);
  return (
    <section id={id} className="hana3-field">
      <aside className="hana3-index">
        <strong>{number}</strong>
        <span>{t("fieldNote")}</span>
        <p>{t(`note${Number(number)}`)}</p>
        <i />
      </aside>
      <div className="hana3-field-body">
        {title ? (
          <div className="hana3-section-head">
            <h2>{title}</h2>
            {note ? <p>{note}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function Notebook({ props }: { props: Props }) {
  const t = useHanaCopy(props.locale);
  const content = section(props.snapshot.sections, "process");
  const entries = records(content.items);
  return (
    <Field
      props={props}
      number="01"
      title={words(content.title, props.locale)}
      note={t("editorialNote")}
      id="field-notes"
    >
      <div className="hana3-editorial">
        {entries.map((entry, index) => (
          <article
            key={index}
            className={index === 0 ? "hana3-feature" : "hana3-teaser"}
            data-reveal="rise"
          >
            <div className="hana3-story-photo">
              <Photo
                props={props}
                role={["podcast.hana", "rooftop.hana", "journey.hana"][index]}
                decorative
              />
              {index > 0 ? (
                <span>{String(index + 1).padStart(2, "0")}</span>
              ) : null}
            </div>
            <div className="hana3-story-copy">
              <h3>{words(entry.title, props.locale)}</h3>
              {index === 0 ? <p>{t("featureIntro")}</p> : null}
              <details className="hana3-note">
                <summary>
                  <span aria-hidden="true">↗</span>
                  {t("read")}
                </summary>
                <p>{words(entry.description, props.locale)}</p>
              </details>
            </div>
          </article>
        ))}
      </div>
    </Field>
  );
}

export function InBetween({ props }: { props: Props }) {
  const t = useHanaCopy(props.locale);
  const about = section(props.snapshot.sections, "about");
  return (
    <Field props={props} number="02" id="about">
      <div className="hana3-between" data-reveal="rise">
        <div className="hana3-market">
          <Photo props={props} role="market.hana" decorative />
        </div>
        <div className="hana3-between-copy">
          <h2 className="hana3-hand">{t("marketNote")}</h2>
          <p>{words(about.body, props.locale)}</p>
        </div>
      </div>
    </Field>
  );
}
