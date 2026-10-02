import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { WORLDS, clockLabel, type WorldId } from "../world";

interface ChapterProps {
  id: WorldId;
  flip?: boolean;
  children: ReactNode;
}

const REVEAL = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
};

/** One hour of the day: the persona's story beside a live diorama. */
const Chapter = ({ id, flip = false, children }: ChapterProps) => {
  const { t } = useTranslation();
  const hour = clockLabel(WORLDS.find((world) => world.id === id)?.hour ?? 0);
  const key = (name: string) => t(`world.${id}.${name}`);
  return (
    <section id={id} className="lw-chapter" data-world-section={id} data-flip={flip} aria-labelledby={`lw-${id}-title`}>
      <span className="lw-ghost-hour" aria-hidden="true">{hour}</span>
      <div className="lw-wrap lw-chapter-grid">
        <motion.div className="lw-story" {...REVEAL}>
          <p className="lw-kicker">
            <span className="lw-kicker-hour">{hour}</span>
            <span>{key("kicker")}</span>
          </p>
          <h2 id={`lw-${id}-title`}>{key("title")}</h2>
          <p className="lw-lede">{key("lede")}</p>
          <ul className="lw-beats">
            <li>{key("beat1")}</li>
            <li>{key("beat2")}</li>
            <li>{key("beat3")}</li>
          </ul>
          <span className="lw-status">{key("status")}</span>
        </motion.div>
        <motion.div className="lw-stage" data-qa={`landing-stage-${id}`} {...REVEAL} transition={{ ...REVEAL.transition, delay: 0.15 }}>
          {children}
        </motion.div>
      </div>
    </section>
  );
};

export default Chapter;
