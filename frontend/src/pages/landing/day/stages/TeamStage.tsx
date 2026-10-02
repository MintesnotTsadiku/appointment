import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

type View = "manager" | "liya";

interface Lane {
  id: string;
  name: string;
}

interface Block {
  lane: string;
  start: number;
  length: number;
  service: string;
  who: string;
  owner: string;
}

const LANES: Lane[] = [
  { id: "selam", name: "Selam" },
  { id: "liya", name: "Liya" },
  { id: "abel", name: "Abel" },
  { id: "tsion", name: "Tsion" },
];

const BLOCKS: Block[] = [
  { lane: "selam", start: 0, length: 1.5, service: "braids", who: "Hiwot", owner: "selam" },
  { lane: "selam", start: 2, length: 1, service: "cut", who: "Mahi", owner: "selam" },
  { lane: "liya", start: 0.5, length: 1, service: "colour", who: "Sara", owner: "liya" },
  { lane: "liya", start: 1.75, length: 0.75, service: "blowdry", who: "Ruth", owner: "liya" },
  { lane: "liya", start: 3, length: 1, service: "treatment", who: "Bethel", owner: "liya" },
  { lane: "abel", start: 0.25, length: 0.75, service: "cut", who: "Yonas", owner: "abel" },
  { lane: "abel", start: 1.5, length: 0.75, service: "cut", who: "Nahom", owner: "abel" },
  { lane: "abel", start: 3.25, length: 0.75, service: "cut", who: "Kal", owner: "abel" },
  { lane: "tsion", start: 1, length: 1.5, service: "braids", who: "Eden", owner: "tsion" },
  { lane: "tsion", start: 2.75, length: 0.75, service: "blowdry", who: "Lulit", owner: "tsion" },
];

const HOURS = ["09", "10", "11", "12", "13"];
const SPAN = 4;

/** One salon morning, seen by the manager or by a single stylist. */
const TeamStage = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>("manager");
  const visible = (lane: Lane) => view === "manager" || lane.id === "liya";
  const shown = (block: Block) => view === "manager" || block.owner === "liya";

  return (
    <div className="lw-team" data-view={view}>
      <div className="lw-seg" role="group" aria-label={t("world.team.viewLabel")}>
        {(["manager", "liya"] as View[]).map((option) => (
          <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} data-qa={`landing-team-${option}`}>
            {t(option === "manager" ? "world.team.viewManager" : "world.team.viewProvider")}
          </button>
        ))}
      </div>
      <div className="lw-board-grid" aria-hidden="true">
        <div className="lw-hours">
          {HOURS.map((hour) => <span key={hour}>{hour}:00</span>)}
        </div>
        <AnimatePresence initial={false}>
          {LANES.filter(visible).map((lane) => (
            <motion.div key={lane.id} className="lw-lane" layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <span className="lw-lane-name">{lane.name}</span>
              <div className="lw-track">
                {BLOCKS.filter((block) => block.lane === lane.id).map((block) => (
                  <motion.span key={block.who + block.start} className="lw-block" data-service={block.service}
                    data-dim={!shown(block)} layout
                    style={{ left: (block.start / SPAN) * 100 + "%", width: (block.length / SPAN) * 100 + "%" }}>
                    <b>{t(`world.team.${block.service}`)}</b>
                    <small>{block.who}</small>
                  </motion.span>
                ))}
                <span className="lw-now" style={{ left: (1.67 / SPAN) * 100 + "%" }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="lw-caption" aria-live="polite">
        {view === "liya" ? t("world.team.yourDay") : ""}
      </p>
    </div>
  );
};

export default TeamStage;
