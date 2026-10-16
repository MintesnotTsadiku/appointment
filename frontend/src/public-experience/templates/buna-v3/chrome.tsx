import { Link } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import { action, section } from "../content";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { useTemplateCredit } from "../credit";
import { SiteHoliday } from "./holiday";
import { words, withLocale } from "./elements";

export function Header({ props }: { props: Props }) {
  const { locale, mode } = props;
  const chrome = usePublicChrome(locale);
  const now = useTimeOfDay();
  return (
    <>
      <header className="buna3-header">
        <Link
          className="buna3-brand"
          to={withLocale(props.publicRoot, props.locale)}
        >
          {props.applicationName}
        </Link>
        <nav aria-label={chrome.t("navLabel")}>
          <a href={`${props.publicRoot}#services`}>{chrome.t("services")}</a>
          <a href={`${props.publicRoot}#about`}>{chrome.t("team")}</a>
          <a href={`${props.publicRoot}#visit`}>{chrome.t("visit")}</a>
        </nav>
        <div className="buna3-controls">
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
            data-qa="buna-mode"
          >
            {chrome.modeName(props.mode)}
          </button>
        </div>
      </header>
      <div className="buna3-running">
        <span data-qa="buna-greeting">{chrome.t(greetingKey(now.part))}</span>
        <SiteHoliday props={props} />
      </div>
    </>
  );
}

export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const credit = useTemplateCredit(chrome);
  const contact = section(props.snapshot.sections, "contact");
  const contactAction = action(contact.action, props.locale);
  return (
    <footer className="buna3-footer">
      <strong>{props.applicationName}</strong>
      <p>
        {words(section(props.snapshot.sections, "footer").body, props.locale)}
      </p>
      <div>
        <Link
          to={withLocale(
            `${props.publicRoot.replace(/\/(en|am)$/, "")}/blog`,
            props.locale,
          )}
        >
          {chrome.t("journal")}
        </Link>
        <Link
          to={withLocale(
            `${props.publicRoot.replace(/\/(en|am)$/, "")}/gallery`,
            props.locale,
          )}
        >
          {chrome.t("gallery")}
        </Link>
        <span>© {new Date().getFullYear()}</span>
      </div>
      {contactAction ? (
        <p>
          <a href={contactAction.href}>{contactAction.label}</a>
        </p>
      ) : null}
      {credit ? (
        <p data-qa="template-credit">
          {credit.before}
          <a href={credit.href} rel="noopener">
            {credit.product}
          </a>
          {credit.after}
        </p>
      ) : null}
    </footer>
  );
}
