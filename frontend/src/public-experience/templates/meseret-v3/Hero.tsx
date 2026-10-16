import type { TemplateProps as Props } from "../types";
import { action, section } from "../content";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { SiteHoliday } from "./holiday";
import { Book, Live, Photo, words } from "./elements";

export function Hero({ props }: { props: Props }) {
  const hero = section(props.snapshot.sections, "hero");
  const chrome = usePublicChrome(props.locale);
  const secondary = action(hero.secondaryAction, props.locale);
  const now = useTimeOfDay();
  return (
    <section className="meseret3-hero meseret3-daybreak">
      <div className="meseret3-hero-image">
        <Photo props={props} role="hero.meseret" item={hero} eager />
      </div>
      <div className="meseret3-hero-copy">
        <p className="meseret3-greeting" data-qa="meseret-greeting">
          {chrome.t(greetingKey(now.part))}
        </p>
        <h1>{words(hero.title, props.locale)}</h1>
        <p className="meseret3-lead">{words(hero.subtitle, props.locale)}</p>
        <div className="meseret3-hero-actions">
          <Book props={props} />
          {secondary ? (
            <a href="#faq">
              {secondary.label} <span aria-hidden="true">→</span>
            </a>
          ) : null}
        </div>
        <Live props={props} />
        <SiteHoliday props={props} />
      </div>
    </section>
  );
}
