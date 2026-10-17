import { Link, useLocation } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import { action, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { useTemplateCredit } from "../credit";
import { SiteHoliday } from "./holiday";
import { Book, Photo, words, withLocale } from "./elements";

import { useHanaCopy } from "./copy";

export function Header({ props }: { props: Props }) {
  const { locale, mode } = props;
  const chrome = usePublicChrome(locale);
  const now = useTimeOfDay();
  const t = useHanaCopy(locale);
  const location = useLocation();
  const anchor = (id: string) => `${props.publicRoot}${location.search}#${id}`;
  return (
    <>
      <header className="hana3-header">
        <Link
          className="hana3-brand"
          to={withLocale(props.publicRoot, props.locale)}
        >
          {props.applicationName}
          <span lang={locale === "am" ? "en" : "am"}>
            {words(
              records(section(props.snapshot.sections, "providers").items)[0]
                ?.name,
              locale === "am" ? "en" : "am",
            )}
          </span>
        </Link>
        <nav aria-label={chrome.t("navLabel")}>
          <a href={anchor("field-notes")}>{t("fieldNotes")}</a>
          <a href={anchor("services")}>{t("conversations")}</a>
          <a href={anchor("about")}>{t("meet")}</a>
        </nav>
        <div className="hana3-controls">
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
            data-qa="hana-mode"
          >
            {chrome.modeName(props.mode)}
          </button>
          <Book props={props} />
        </div>
      </header>
      <div className="hana3-running">
        <span data-qa="hana-greeting">{chrome.t(greetingKey(now.part))}</span>
        <SiteHoliday props={props} />
      </div>
    </>
  );
}

export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const credit = useTemplateCredit(chrome);
  const t = useHanaCopy(props.locale);
  const contact = section(props.snapshot.sections, "contact");
  const contactAction = action(contact.action, props.locale);
  return (
    <footer className="hana3-footer">
      <div className="hana3-skyline">
        <Photo props={props} role="skyline.hana" decorative />
        <p className="hana3-hand">
          {words(section(props.snapshot.sections, "footer").body, props.locale)}
        </p>
      </div>
      <strong>
        {props.applicationName}
        <span lang={props.locale === "am" ? "en" : "am"}>
          {" "}
          /{" "}
          {words(
            records(section(props.snapshot.sections, "providers").items)[0]
              ?.name,
            props.locale === "am" ? "en" : "am",
          )}
        </span>
      </strong>
      <svg className="hana3-stamp" viewBox="0 0 180 140" aria-hidden="true">
        <g transform="rotate(-15 70 70)">
          <circle cx="70" cy="70" r="53" />
          <circle cx="70" cy="70" r="48" />
          <path d="M28 47H112M28 90H112" />
          <text x="70" y="65" textAnchor="middle">
            {t("stampCity")}
          </text>
          <text x="70" y="84" textAnchor="middle">
            {t("stampCountry")}
          </text>
        </g>
        <path d="M100 100q20-10 40 0t40 0M100 110q20-10 40 0t40 0M100 120q20-10 40 0t40 0" />
      </svg>
      <a className="hana3-back" href="#top">
        {t("top")} ↑
      </a>
      <p>{t("city")}</p>
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
