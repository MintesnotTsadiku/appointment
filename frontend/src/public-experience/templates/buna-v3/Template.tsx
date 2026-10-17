import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { BookingTemplateProps, TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { useMotionLevel, useReveal } from "../kit";
import { Book, Photo, words, withLocale } from "./elements";
import { Header, Footer } from "./chrome";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { People, Bean, SectionHead } from "./Story";
import { Visit } from "./Visit";
import { Reservation } from "./Reservation";
import { useBunaCopy } from "./copy";
import "./site.css";
import "./atlas.css";
import "./sections.css";
import "./responsive.css";
export { Header, Footer } from "./chrome";
export { Photo } from "./elements";

export function Site(props: Props) {
  const { mode } = props;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView();
  }, []);
  const level = useMotionLevel(props.snapshot.compiledDesign.motion);
  useReveal(root, level, props.locale);
  const chrome = usePublicChrome(props.locale);
  const t = useBunaCopy(props.locale);
  const faq = section(props.snapshot.sections, "faq");
  return (
    <div
      ref={root}
      className="buna3"
      data-pe-root
      data-pe-mode={mode}
      data-motion-level={level}
      data-template="buna-experiences-v3"
      lang={props.locale}
      style={props.rootStyle}
    >
      <a className="buna3-skip" href="#buna-main">
        {chrome.t("skip")}
      </a>
      <Header props={props} />
      <main id="buna-main">
        <Hero props={props} />
        <div className="buna3-route">
          <People props={props} />
          <Bean props={props} />
          <Services props={props} />
          <Reservation props={props} />
          <Visit props={props} />
          <section id="faq" className="buna3-section buna3-faq">
            <SectionHead
              title={words(faq.title, props.locale)}
              note={t("curiosity")}
            />
            <div>
              {records(faq.items).map((item, i) => (
                <article key={i}>
                  <h3>{words(item.question, props.locale)}</h3>
                  <p>{words(item.answer, props.locale)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
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
      className="buna3 buna3-handoff"
      data-pe-root
      data-pe-booking
      data-pe-mode={mode}
      data-template="buna-experiences-v3"
      style={props.rootStyle}
      lang={props.locale}
    >
      <Header props={props} />
      <main id="buna-main">
        <section className="buna3-handoff-intro">
          <div>
            <Link
              className="buna3-text-link"
              to={withLocale(props.publicRoot, props.locale)}
            >
              {chrome.t("backToSite")}
            </Link>
            <h1>{words(content.title, props.locale)}</h1>
            <p>{words(content.body, props.locale)}</p>
            <Book props={props} href={props.bookingPath || undefined} />
          </div>
          <Photo props={props} role="people.buna" eager />
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
      className="buna3 buna3-loading"
      data-pe-mode={mode}
      role="status"
      aria-busy="true"
    >
      <svg viewBox="0 0 160 100" aria-hidden="true">
        <path d="M30 80C20 50 100 65 90 30S125 5 135 20" />
        <circle cx="30" cy="80" r="6" />
        <circle cx="135" cy="20" r="6" />
      </svg>
      <span>{chrome.t("loadingSite")}</span>
    </div>
  );
}
