import { useBrandedTranslation } from "@/lib/platform-brand";
import { partnersPath } from "../../shared/offer";
import type { EntryLinks } from "../../shared/useEntryLinks";
import Promises from "./Promises";

/** 23:45. The call to action. The showcase businesses are in the template gallery (23:00). */
const Finale = ({ entry }: { entry: EntryLinks }) => {
  const { t, brand, language } = useBrandedTranslation();
  return (
    <section id="night" className="lw-finale" data-world-section="night" aria-labelledby="lw-night-title">
      <div className="lw-wrap">
        <p className="lw-eyebrow">{t("world.night.eyebrow")}</p>
        <h2 id="lw-night-title" className="lw-display">{t("world.night.title")}</h2>
        <p className="lw-lede">{t("world.night.lede")}</p>
        <div className="lw-prologue-actions">
          {entry.authenticated ? (
            <a className="lw-btn lw-btn-solid" href={entry.workspace}>{t("world.nav.workspace")}</a>
          ) : (
            <>
              <a className="lw-btn lw-btn-solid" href={entry.start} data-qa="landing-final-start">{t(entry.startLabel)}</a>
              <a className="lw-btn lw-btn-ghost" href="/login">{t("world.nav.signIn")}</a>
            </>
          )}
        </div>
        <Promises variant="compact" />
        <footer className="lw-footer">
          <span>© {new Date().getFullYear()} {t("world.night.footer")}</span>
          <a href="/templates" data-qa="landing-footer-templates">{t("world.night.templates")}</a>
          <a href="/tools" data-qa="landing-free-tools">{t("world.night.freeTools")}</a>
          {brand.growth.directoryPublic && <a href="/directory" data-qa="landing-directory">{t("world.night.directory")}</a>}
          {brand.growth.partnerProgramEnabled && <a href={partnersPath(language)} data-qa="landing-partners">{t("world.night.partners")}</a>}
          <span>{t("world.night.fiction")}</span>
        </footer>
      </div>
    </section>
  );
};

export default Finale;
