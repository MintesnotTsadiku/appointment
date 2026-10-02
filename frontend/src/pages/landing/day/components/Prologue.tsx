import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import type { EntryLinks } from "../../shared/useEntryLinks";
import { CHAPTERS, clockLabel } from "../world";

/** 05:30. The city before the first booking, and the day's timetable. */
const Prologue = ({ entry }: { entry: EntryLinks }) => {
  const { t } = useTranslation();
  return (
    <section className="lw-prologue" data-world-section="dawn" aria-labelledby="lw-title">
      <div className="lw-wrap">
        <p className="lw-eyebrow">{t("world.dawn.eyebrow")}</p>
        <motion.h1
          id="lw-title"
          className="lw-display"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("world.dawn.title1")}
          <br />
          <em>{t("world.dawn.title2")}</em>
        </motion.h1>
        <p className="lw-lede">{t("world.dawn.lede")}</p>
        <div className="lw-prologue-actions">
          <a className="lw-btn lw-btn-solid" href="#solo" data-qa="landing-begin">{t("world.dawn.begin")} ↓</a>
          {entry.authenticated ? (
            <a className="lw-btn lw-btn-ghost" href={entry.workspace}>{t("world.nav.workspace")}</a>
          ) : (
            <a className="lw-btn lw-btn-ghost" href={entry.start} data-qa="landing-start">{t(entry.startLabel)}</a>
          )}
        </div>
        <Timetable />
        <p className="lw-hint" aria-hidden="true">
          <span className="lw-hint-line" />
          {t("world.dawn.hint")}
        </p>
      </div>
    </section>
  );
};

/** A departures board listing the day's chapters. */
const Timetable = () => {
  const { t } = useTranslation();
  return (
    <nav className="lw-board" aria-labelledby="lw-board-title" data-qa="landing-timetable">
      <h2 id="lw-board-title">{t("world.dawn.cast")}</h2>
      <ol>
        {CHAPTERS.map((world, order) => (
          <motion.li
            key={world.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + order * 0.08, duration: 0.5 }}
          >
            <a href={"#" + world.id}>
              <span className="lw-board-time">{clockLabel(world.hour)}</span>
              <span className="lw-board-name">{t(`world.${world.id}.short`)}</span>
              <span className="lw-board-state">{t(`world.${world.id}.status`)}</span>
            </a>
          </motion.li>
        ))}
      </ol>
    </nav>
  );
};

export default Prologue;
