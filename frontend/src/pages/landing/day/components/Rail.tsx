import { useTranslation } from "@/lib/i18n";
import { CHAPTERS, WORLDS, clockLabel } from "../world";

/** Desktop hour rail: one tick per chapter, the current hour highlighted. */
const Rail = ({ index }: { index: number }) => {
  const { t } = useTranslation();
  const current = WORLDS[index]?.id;
  return (
    <nav className="lw-rail" aria-label={t("world.nav.chapters")}>
      {CHAPTERS.map((world) => (
        <a key={world.id} href={"#" + world.id} aria-current={current === world.id ? "step" : undefined}>
          <span className="lw-rail-label">{t(`world.${world.id}.short`)}</span>
          <span>{clockLabel(world.hour)}</span>
        </a>
      ))}
    </nav>
  );
};

export default Rail;
