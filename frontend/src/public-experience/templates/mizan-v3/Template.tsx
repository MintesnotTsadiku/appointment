import { useRef } from "react";
import { Link } from "react-router-dom";
import type { BookingTemplateProps, TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { useMotionLevel, useReveal } from "../kit";
import { Book, Live, Photo, words, withLocale } from "./elements";
import { Header, Footer } from "./chrome";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { About, Process, Visit } from "./sections";
import "./site.css";
export { Header, Footer } from "./chrome";
export { Photo } from "./elements";

export function Site(props: Props) {
  const { mode } = props;
  const root = useRef<HTMLDivElement>(null);
  const level = useMotionLevel(props.snapshot.compiledDesign.motion);
  useReveal(root, level, props.locale);
  const chrome = usePublicChrome(props.locale);
  const faq = section(props.snapshot.sections, "faq");
  const booking = section(props.snapshot.sections, "booking_cta");
  return (
    <div
      ref={root}
      className="mizan3"
      data-pe-root
      data-pe-mode={mode}
      data-motion-level={level}
      data-template="mizan-inspection-v3"
      lang={props.locale}
      style={props.rootStyle}
    >
      <a className="mizan3-skip" href="#mizan-main">
        {chrome.t("skip")}
      </a>
      <Header props={props} />
      <main id="mizan-main">
        <Hero props={props} />

        <Services props={props} />
        <About props={props} />
        <Process props={props} />
        <section id="faq" className="mizan3-section mizan3-faq">
          <h2>{words(faq.title, props.locale)}</h2>
          <div>
            {records(faq.items).map((item, index) => (
              <details key={index}>
                <summary>{words(item.question, props.locale)}</summary>
                <p>{words(item.answer, props.locale)}</p>
              </details>
            ))}
          </div>
        </section>
        <Visit props={props} />
        <section className="mizan3-section mizan3-booking">
          <span className="mizan3-index" aria-hidden="true">
            ↗
          </span>
          <h2>{words(booking.title, props.locale)}</h2>
          <p>{words(booking.body, props.locale)}</p>
          <Book props={props} />
          <Live props={props} />
        </section>
      </main>
      <Footer props={props} />
    </div>
  );
}

export function Booking(props: BookingTemplateProps) {
  const { mode } = props;
  const chrome = usePublicChrome(props.locale);
  const content = section(props.snapshot.sections, "booking_cta");
  return (
    <div
      className="mizan3 mizan3-handoff"
      data-pe-root
      data-pe-booking
      data-pe-mode={mode}
      data-template="mizan-inspection-v3"
      style={props.rootStyle}
      lang={props.locale}
    >
      <Header props={props} />
      <main>
        <section className="mizan3-hero">
          <div>
            <Link
              className="mizan3-text-link"
              to={withLocale(props.publicRoot, props.locale)}
            >
              {chrome.t("backToSite")}
            </Link>
            <h1>{words(content.title, props.locale)}</h1>
            <p>{words(content.body, props.locale)}</p>
            <Book props={props} href={props.bookingPath || undefined} />
            <Live props={props} />
          </div>
          <Photo props={props} role="hero.mizan" eager />
        </section>
        <Services props={props} bookingPath={props.bookingPath} />
      </main>
      <Footer props={props} />
    </div>
  );
}

export function SiteLoading({
  mode,
  locale = "en",
}: {
  mode: Props["mode"];
  locale?: string;
}) {
  const chrome = usePublicChrome(locale);
  return (
    <div
      className="mizan3 mizan3-loading"
      data-pe-mode={mode}
      role="status"
      aria-busy="true"
    >
      <span>{chrome.t("loadingSite")}</span>
      <div aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
