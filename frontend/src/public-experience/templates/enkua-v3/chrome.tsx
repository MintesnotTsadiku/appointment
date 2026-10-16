import { Link } from "react-router-dom";
import { action, section } from "../content";
import type { TemplateProps as Props } from "../types";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { useTemplateCredit } from "../credit";
import { Book, words, withLocale } from "./elements";
import { SiteHoliday } from "./holiday";
import { useEnkuaCopy } from "./copy";

function Wordmark({ props }: { props: Props }) {
  return (
    <Link
      className="enkua3-wordmark"
      aria-label={props.applicationName}
      to={withLocale(props.publicRoot, props.locale)}
    >
      {props.applicationName.split(" ")[0]}
    </Link>
  );
}

export function Header({ props }: { props: Props }) {
  const { mode } = props;
  const chrome = usePublicChrome(props.locale);
  const t = useEnkuaCopy(props.locale);
  const now = useTimeOfDay();
  return (
    <header className="enkua3-header">
      <Wordmark props={props} />
      <span className="enkua3-descriptor">{t("studioDescriptor")}</span>
      <nav aria-label={chrome.t("navLabel")}>
        <a href={`${props.publicRoot}#work`}>{t("work")}</a>
        <a href={`${props.publicRoot}#services`}>{t("whatWeDo")}</a>
        <a href={`${props.publicRoot}#about`}>{t("thePeople")}</a>
      </nav>
      <Book props={props}>{t("bookSlot")}</Book>
      <div className="enkua3-controls">
        <span data-qa="enkua-greeting">{chrome.t(greetingKey(now.part))}</span>
        <a
          href={`${props.publicRoot.replace(/\/(en|am)$/, "")}${props.locale === "am" ? "" : "/am"}`}
          lang={props.locale === "am" ? "en" : "am"}
        >
          {chrome.t("otherLanguage")}
        </a>
        <button
          type="button"
          onClick={props.toggleMode}
          aria-label={chrome.modeSwitchLabel(mode)}
          data-qa="enkua-mode"
        >
          {chrome.modeName(props.mode)}
        </button>
        <SiteHoliday props={props} />
      </div>
    </header>
  );
}

export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const credit = useTemplateCredit(chrome);
  const t = useEnkuaCopy(props.locale);
  const contact = section(props.snapshot.sections, "contact");
  const link = action(contact.action, props.locale);
  return (
    <footer className="enkua3-footer">
      <Wordmark props={props} />
      <div className="enkua3-footer-info">
        <p className="enkua3-descriptor">{t("studioDescriptor")}</p>
        <p>{words(contact.body, props.locale)}</p>
        {link && <a href={link.href}>{link.label}</a>}
      </div>
      <nav aria-label={chrome.t("navLabel")}>
        <a href="#work">{t("work")}</a>
        <a href="#services">{chrome.t("sessions")}</a>
        <a href="#visit">{chrome.t("visit")}</a>
      </nav>
      <p className="enkua3-scribble">{t("brighterAddis")}</p>
      <div className="enkua3-colophon">
        <span>
          © {new Date().getFullYear()} {props.applicationName}
        </span>
        {credit && (
          <span data-qa="template-credit">
            {credit.before}
            <a href={credit.href} rel="noopener">
              {credit.product}
            </a>
            {credit.after}
          </span>
        )}
      </div>
    </footer>
  );
}
