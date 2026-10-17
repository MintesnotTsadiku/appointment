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
import { Visit } from "./sections";
import { Notebook, InBetween } from "./Notebook";
import { BookingPanel } from "./BookingPanel";
import { useHanaCopy } from "./copy";
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
  return (
    <div
      ref={root}
      className="hana3"
      data-pe-root
      data-pe-mode={mode}
      data-motion-level={level}
      data-template="hana-conversations-v3"
      lang={props.locale}
      style={props.rootStyle}
    >
      <a className="hana3-skip" href="#hana-main">
        {chrome.t("skip")}
      </a>
      <Header props={props} />
      <main id="hana-main">
        <Hero props={props} />

        <div className="hana3-route">
          <Notebook props={props} />
          <InBetween props={props} />
          <Services props={props} />
          <BookingPanel props={props} />
        </div>
        <div className="hana3-support">
          <details id="visit">
            <summary>
              {words(
                section(props.snapshot.sections, "locations").title,
                props.locale,
              )}
            </summary>
            <Visit props={props} />
          </details>
          <details id="faq">
            <summary>{words(faq.title, props.locale)}</summary>
            <div className="hana3-faq">
              {records(faq.items).map((item, index) => (
                <details key={index}>
                  <summary>{words(item.question, props.locale)}</summary>
                  <p>{words(item.answer, props.locale)}</p>
                </details>
              ))}
            </div>
          </details>
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
      className="hana3 hana3-handoff"
      data-pe-root
      data-pe-booking
      data-pe-mode={mode}
      data-template="hana-conversations-v3"
      style={props.rootStyle}
      lang={props.locale}
    >
      <Header props={props} />
      <main>
        <section className="hana3-hero">
          <div>
            <Link
              className="hana3-text-link"
              to={withLocale(props.publicRoot, props.locale)}
            >
              {chrome.t("backToSite")}
            </Link>
            <h1>{words(content.title, props.locale)}</h1>
            <p>{words(content.body, props.locale)}</p>
            <Book props={props} href={props.bookingPath || undefined} />
            <Live props={props} />
          </div>
          <Photo props={props} role="hero.hana" eager />
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
  const t = useHanaCopy(locale);
  return (
    <div
      className="hana3 hana3-loading"
      data-pe-mode={mode}
      role="status"
      aria-busy="true"
    >
      <span className="hana3-loading-number" aria-hidden="true">
        01
      </span>
      <span>{t("paper")}</span>
      <span className="sr-only">{chrome.t("loadingSite")}</span>
      <svg aria-hidden="true" viewBox="0 0 220 80">
        <path d="M10 65H80V15H210" />
        <circle cx="10" cy="65" r="5" />
        <circle cx="210" cy="15" r="5" />
      </svg>
    </div>
  );
}
