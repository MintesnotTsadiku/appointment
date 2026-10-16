import { useMeseretCopy } from "./copy";
import { Link } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import { action, section } from "../content";
import { usePublicChrome } from "../chrome";
import { Sun, Moon } from "lucide-react";
import { useTemplateCredit } from "../credit";

import { words, withLocale } from "./elements";

export function Header({ props }: { props: Props }) {
  const { locale, mode } = props;
  const t = useMeseretCopy(locale);
  const chrome = usePublicChrome(locale);

  return (
    <>
      <header className="meseret3-header">
        <Link
          className="meseret3-brand"
          to={withLocale(props.publicRoot, props.locale)}
        >
          {props.locale === "am"
            ? props.applicationName
            : props.snapshot.compiledDesign.identity.shortName ||
              props.applicationName}
        </Link>
        <nav aria-label={chrome.t("navLabel")}>
          <a href={`${withLocale(props.publicRoot, props.locale)}#services`}>
            {chrome.t("services")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#about`}>
            {chrome.t("team")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#prepare`}>
            {t("prepare")}
          </a>
          <a href={`${withLocale(props.publicRoot, props.locale)}#faq`}>
            {chrome.t("questions")}
          </a>
        </nav>
        <div className="meseret3-controls">
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
            data-qa="meseret-mode"
          >
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
    </>
  );
}

export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const credit = useTemplateCredit(chrome);
  const contact = section(props.snapshot.sections, "contact");
  const contactAction = action(contact.action, props.locale);
  return (
    <footer className="meseret3-footer">
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
