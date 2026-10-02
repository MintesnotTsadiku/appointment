import { motion, useInView } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import { useTranslation } from "@/lib/i18n";
import type { EntryLinks } from "../../shared/useEntryLinks";
import { useShowcaseDoors, type ShowcaseDoor } from "../../shared/useShowcaseDoors";

/** 23:45. The call to action and doors into real showcase businesses. */
const Finale = ({ entry }: { entry: EntryLinks }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const near = useInView(ref, { once: true, margin: "600px 0px" });
  const doors = useShowcaseDoors(near);
  return (
    <section ref={ref} id="night" className="lw-finale" data-world-section="night" aria-labelledby="lw-night-title">
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
        {doors.length > 0 && <Doors doors={doors} />}
        <footer className="lw-footer">
          <span>© {new Date().getFullYear()} {t("world.night.footer")}</span>
          <span>{t("world.night.fiction")}</span>
        </footer>
      </div>
    </section>
  );
};

const Doors = ({ doors }: { doors: ShowcaseDoor[] }) => {
  const { t } = useTranslation();
  return (
    <div className="lw-doors" data-qa="landing-doors">
      <h2>{t("world.night.doorsTitle")}</h2>
      <p className="lw-lede">{t("world.night.doorsLede")}</p>
      <ul className="lw-doors-grid">
        {doors.map((door, order) => (
          <motion.li
            key={door.slug}
            className="lw-door"
            style={{ "--door-accent": door.accent ?? "#fff" } as CSSProperties}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: order * 0.08, duration: 0.7 }}
            data-qa="landing-door"
          >
            {door.hero && <img className="lw-door-hero" src={door.hero} alt="" loading="lazy" />}
            <div className="lw-door-body">
              {door.logo && <img className="lw-door-logo" src={door.logo} alt="" loading="lazy" />}
              <h3 className="lw-door-name">{door.name}</h3>
              <div className="lw-door-actions">
                <a href={"/" + door.slug} aria-label={t("world.night.visit") + " " + door.name}>{t("world.night.visit")}</a>
                <a className="lw-door-book" href={"/" + door.slug + "/book"} aria-label={t("world.night.book") + " " + door.name}>
                  {t("world.night.book")} →
                </a>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default Finale;
