import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Menu, X } from "lucide-react";
import type { TemplateProps as Props } from "../types";
import { action, section } from "../content";
import { usePublicChrome } from "../chrome";
import { useTemplateCredit } from "../credit";
import { words, withLocale } from "./elements";
import { useBunaCopy } from "./copy";

const links = [
  ["home", "buna-main"],
  ["people", "about"],
  ["bean", "bean"],
  ["experiences", "services"],
  ["book", "reserve"],
  ["visit", "visit"],
  ["faq", "faq"],
];

function useHomeAnchor(props: Props) {
  const { pathname } = useLocation();
  const home = withLocale(
    props.publicRoot.replace(/\/(en|am)$/, ""),
    props.locale,
  );
  return (id: string) => `${pathname === home ? "" : home}#${id}`;
}

function Wordmark({ props }: { props: Props }) {
  return (
    <span className="buna3-wordmark">
      <span lang="am">{props.snapshot.localTitle?.am}</span>
      <span lang="en">
        {props.snapshot.compiledDesign.identity.applicationName ||
          props.applicationName}
      </span>
    </span>
  );
}

export function Header({ props }: { props: Props }) {
  const { locale, mode } = props;
  const chrome = usePublicChrome(locale);
  const t = useBunaCopy(locale);
  const anchor = useHomeAnchor(props);
  const [open, setOpen] = useState(false);
  const root = props.publicRoot.replace(/\/(en|am)$/, "");
  return (
    <header className="buna3-rail">
      <Link className="buna3-brand" to={withLocale(root, locale)}>
        <Wordmark props={props} />
      </Link>
      <p className="buna3-rail-intro">{t("railIntro")}</p>
      <button
        className="buna3-menu"
        aria-label={chrome.t("menu")}
        aria-expanded={open}
        aria-controls="buna-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        id="buna-navigation"
        data-open={open}
        aria-label={chrome.t("navLabel")}
      >
        {links.map(([label, id], i) => (
          <a href={anchor(id)} key={id} onClick={() => setOpen(false)}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {t(label)}
          </a>
        ))}
      </nav>
      <div className="buna3-controls">
        <a
          href={`${root}${locale === "am" ? "" : "/am"}`}
          lang={locale === "am" ? "en" : "am"}
        >
          {chrome.t("otherLanguage")}
        </a>
        <button
          onClick={props.toggleMode}
          aria-label={chrome.modeSwitchLabel(mode)}
          data-qa="buna-mode"
        >
          {mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
      <p className="buna3-rail-quote">{t("quote")}</p>
    </header>
  );
}

export function Footer({ props }: { props: Props }) {
  const chrome = usePublicChrome(props.locale);
  const t = useBunaCopy(props.locale);
  const anchor = useHomeAnchor(props);
  const credit = useTemplateCredit(chrome);
  const contact = action(
    section(props.snapshot.sections, "contact").action,
    props.locale,
  );
  return (
    <footer className="buna3-footer">
      <div>
        <Wordmark props={props} />
        <p>
          {words(section(props.snapshot.sections, "footer").body, props.locale)}
        </p>
      </div>
      <nav aria-label={chrome.t("navLabel")}>
        <a href={anchor("about")}>{t("people")}</a>
        <a href={anchor("bean")}>{t("bean")}</a>
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
      </nav>
      <p className="buna3-note">{t("quote")}</p>
      {contact ? <a href={contact.href}>{contact.label}</a> : null}
      <small>© {new Date().getFullYear()}</small>
      {credit ? (
        <p className="buna3-credit" data-qa="template-credit">
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
