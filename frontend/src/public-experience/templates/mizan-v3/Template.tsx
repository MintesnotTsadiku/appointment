import { useRef } from "react";
import { Link } from "react-router-dom";
import type { BookingTemplateProps, TemplateProps as Props } from "../types";
import { usePublicChrome } from "../chrome";
import { useMotionLevel, useReveal } from "../kit";
import { withLocale } from "./elements";
import { Header, Footer } from "./chrome";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { About, Visit } from "./sections";
import { Approach } from "./Approach";
import { Reservation } from "./Reservation";
import { Report } from "./Report";
import "./site.css";
export { Header, Footer } from "./chrome";
export { Photo } from "./elements";

export function Site(props: Props) {
  const { mode } = props;
  const root = useRef<HTMLDivElement>(null);
  const level = useMotionLevel(props.snapshot.compiledDesign.motion);
  useReveal(root, level, props.locale);
  const chrome = usePublicChrome(props.locale);
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
        <Approach props={props} />
        <About props={props} />
        <Reservation props={props} />
        <Report props={props} />
        <Visit props={props} />
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
        <Link
          className="mizan3-text-link mizan3-back"
          to={withLocale(props.publicRoot, props.locale)}
        >
          {chrome.t("backToSite")}
        </Link>
        <Reservation props={props} immediate />
        <Services props={props} bookingPath={props.bookingPath} />
        <Approach props={props} />
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
      <div className="mizan3-loading-sheet" aria-hidden="true">
        <div>
          <i />
          <i />
          <i />
        </div>
        <b />
      </div>
      <div className="mizan3-loading-columns" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
