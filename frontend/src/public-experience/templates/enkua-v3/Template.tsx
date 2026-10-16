import { useRef } from "react";
import { Link } from "react-router-dom";
import type { BookingTemplateProps, TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { useMotionLevel, useReveal } from "../kit";
import { Book, Photo, words, withLocale } from "./elements";
import { Header, Footer } from "./chrome";
import { Hero, Gallery } from "./Hero";
import { Services } from "./Services";
import { About, Visit } from "./sections";
import { BookingStrip } from "./BookingStrip";
import { useEnkuaCopy } from "./copy";
import "./site.css";
export { Header, Footer } from "./chrome";
export { Photo } from "./elements";

export function Site(props: Props) {
  const { mode } = props;
  const root = useRef<HTMLDivElement>(null);
  const level = useMotionLevel(props.snapshot.compiledDesign.motion);
  useReveal(root, level, props.locale);
  const chrome = usePublicChrome(props.locale);
  const t = useEnkuaCopy(props.locale);
  const faq = section(props.snapshot.sections, "faq");
  const booking = section(props.snapshot.sections, "booking_cta");
  return (
    <div
      ref={root}
      className="enkua3"
      data-pe-root
      data-pe-mode={mode}
      data-motion-level={level}
      data-template="enkua-photography-v3"
      lang={props.locale}
      style={props.rootStyle}
    >
      <a className="enkua3-skip" href="#enkua-main">
        {chrome.t("skip")}
      </a>
      <Header props={props} />
      <main id="enkua-main">
        <Hero props={props} />
        <Gallery props={props} />
        <Services props={props} />
        <About props={props} />
        <Visit props={props} />
        <BookingStrip props={props} />
        <section className="enkua3-notes">
          <div>
            <Photo props={props} role="business.enkua" />
            <p>{t("arriveAsYouAre")}</p>
          </div>
          <div>
            <Photo props={props} role="graduation.enkua" />
            <p>{t("milestonesMatter")}</p>
          </div>
          <details id="faq">
            <summary>{words(faq.title, props.locale)}</summary>
            {records(faq.items).map((item, i) => (
              <div key={i}>
                <h3>{words(item.question, props.locale)}</h3>
                <p>{words(item.answer, props.locale)}</p>
              </div>
            ))}
          </details>
        </section>
        <section className="enkua3-closing">
          <h2>{words(booking.title, props.locale)}</h2>
          <Book props={props} arrow="→">
            {t("bookSession")}
          </Book>
          <p className="enkua3-scribble">{t("moreGoodPeople")}</p>
        </section>
      </main>
      <Footer props={props} />
    </div>
  );
}

export function Booking(props: BookingTemplateProps) {
  const { mode } = props;
  const chrome = usePublicChrome(props.locale);
  return (
    <div
      className="enkua3 enkua3-handoff"
      data-pe-root
      data-pe-booking
      data-pe-mode={mode}
      data-template="enkua-photography-v3"
      style={props.rootStyle}
      lang={props.locale}
    >
      <Header props={props} />
      <main>
        <Link
          className="enkua3-text-link"
          to={withLocale(props.publicRoot, props.locale)}
        >
          {chrome.t("backToSite")}
        </Link>
        <BookingStrip props={props} />
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
      className="enkua3 enkua3-loading"
      data-pe-mode={mode}
      role="status"
      aria-busy="true"
    >
      <span className="enkua3-loading-label">{chrome.t("loadingSite")}</span>
      <div className="enkua3-loading-composition" aria-hidden="true">
        <div className="enkua3-loading-type"><i /><i /><i /></div>
        <div className="enkua3-loading-sun" />
        <div className="enkua3-loading-portrait" />
        <div className="enkua3-loading-frame" />
      </div>
      <div className="enkua3-loading-ribbon" aria-hidden="true" />
    </div>
  );
}
