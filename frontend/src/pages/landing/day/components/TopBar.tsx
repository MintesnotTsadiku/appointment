import LanguageToggle from "@/components/language-toggle";
import { useTranslation } from "@/lib/i18n";
import type { EntryLinks } from "../../shared/useEntryLinks";
import { clockLabel } from "../world";

/** Floating bar: brand, the story clock, language and the account entry. */
const TopBar = ({ hour, entry }: { hour: number; entry: EntryLinks }) => {
  const { t } = useTranslation();
  return (
    <header className="lw-bar" data-qa="landing-bar">
      <a className="lw-brand" href="/" aria-label={t("world.nav.home")}>
        <span className="lw-brand-mark" aria-hidden="true" />
        <span className="lw-brand-name">Meet.et</span>
      </a>
      <span className="lw-clock" role="timer" aria-label={t("world.nav.clock")} aria-live="off" data-qa="landing-clock">
        {clockLabel(hour)}
      </span>
      <span className="lw-bar-spacer" />
      <div className="lw-bar-actions">
        <LanguageToggle />
        {entry.authenticated ? (
          <a className="lw-btn lw-btn-solid lw-btn-small" href={entry.workspace}>{t("world.nav.workspace")}</a>
        ) : (
          <>
            <a className="lw-btn lw-btn-ghost lw-btn-small lw-bar-signin" href="/login">{t("world.nav.signIn")}</a>
            <a className="lw-btn lw-btn-solid lw-btn-small lw-bar-start" href={entry.start}>{t(entry.startLabel)}</a>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;
