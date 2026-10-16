import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import type { TemplateProps as Props } from "../types";
import { section } from "../content";
import { usePublicChrome } from "../chrome";
import { greetingKey, useTimeOfDay } from "../kit";
import { useTemplateCredit } from "../credit";
import { SiteHoliday } from "./holiday";
import { words, withLocale } from "./elements";
import { useMizanCopy } from "./copy";

export function Brand({ props }: { props: Props }) {
  const identity = props.snapshot.compiledDesign.identity;
  const amharicName =
    props.snapshot.localTitle?.am || identity.applicationNameAm;
  return (
    <Link
      className="mizan3-brand"
      to={withLocale(props.publicRoot, props.locale)}
      aria-label={props.applicationName}
    >
      <span className="mizan3-mark" aria-hidden="true">
        {identity.applicationName.charAt(0)}
      </span>
      <span>
        <strong lang="en">{identity.applicationName}</strong>
        {amharicName && <strong lang="am">{amharicName}</strong>}
      </span>
    </Link>
  );
}
export function Header({ props }: { props: Props }) {
  const { mode } = props;
  const chrome = usePublicChrome(props.locale);
  const t = useMizanCopy(props.locale);
  const now = useTimeOfDay();
  return (
    <>
      <header className="mizan3-header">
        <Brand props={props} />
        <nav aria-label={chrome.t("navLabel")}>
          <a href={`${withLocale(props.publicRoot, props.locale)}#services`}>
            {chrome.t("services")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#approach`}>
            {t("ourApproach")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#about`}>
            {t("theTeam")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#visit`}>
            {chrome.t("visit")}
          </a>
        </nav>
        <div className="mizan3-controls">
          <button
            type="button"
            onClick={props.toggleMode}
            aria-label={chrome.modeSwitchLabel(mode)}
            data-qa="mizan-mode"
          >
            {mode === "dark" ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
          </button>
          <a
            href={`${props.publicRoot.replace(/\/(en|am)$/, "")}${props.locale === "am" ? "" : "/am"}`}
            lang={props.locale === "am" ? "en" : "am"}
          >
            {chrome.t("otherLanguage")}
          </a>
        </div>
        <span className="mizan3-greeting" data-qa="mizan-greeting">
          {chrome.t(greetingKey(now.part))}
        </span>
      </header>
      <div className="mizan3-holiday">
        <SiteHoliday props={props} />
      </div>
    </>
  );
}
export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const credit = useTemplateCredit(chrome);
  return (
    <footer className="mizan3-footer">
      <Brand props={props} />
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
        <span>
          © {new Date().getFullYear()} {props.applicationName}
        </span>
      </div>
      {credit && (
        <p className="mizan3-credit" data-qa="template-credit">
          {credit.before}
          <a href={credit.href} rel="noopener">
            {credit.product}
          </a>
          {credit.after}
        </p>
      )}
    </footer>
  );
}
