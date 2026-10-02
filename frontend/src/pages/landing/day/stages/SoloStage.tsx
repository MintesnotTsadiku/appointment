import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useStoryStep } from "./useStoryStep";

const SLOTS = ["07:00", "07:30", "08:15", "09:00", "10:30", "11:15"];
const DATES = [28, 29, 30, 1, 2];

/** Hana's booking page fills itself in while the assistant narrates. */
const SoloStage = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const step = useStoryStep(ref, 4);
  const feed = [
    { at: 1, text: t("world.solo.held") },
    { at: 2, text: t("world.solo.reminder") },
    { at: 3, text: t("world.solo.history") },
  ].filter((item) => step >= item.at);

  return (
    <div ref={ref} className="lw-solo">
      <div className="lw-phone" aria-hidden="true">
        <div className="lw-phone-head">
          <span className="lw-avatar">H</span>
          <div>
            <strong>{t("world.solo.page")}</strong>
            <span className="lw-mono-sm">meet.et/hana</span>
          </div>
        </div>
        <div className="lw-dates">
          {DATES.map((date, index) => (
            <span key={date} data-on={index === 1}>{date}</span>
          ))}
        </div>
        <p className="lw-phone-label">{t("world.solo.pick")}</p>
        <div className="lw-slots">
          {SLOTS.map((slot, index) => (
            <span key={slot} className="lw-slot" data-state={slotState(index, step)}>
              {slot}
            </span>
          ))}
        </div>
        <AnimatePresence>
          {step >= 2 && (
            <motion.div className="lw-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              ✓ {t("world.solo.booked")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="lw-feed">
        <p className="lw-feed-title">
          <span className="lw-pulse" aria-hidden="true" /> {t("world.solo.assistant")}
        </p>
        <ol>
          <AnimatePresence initial={false}>
            {feed.map((item) => (
              <motion.li key={item.at} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <span className="lw-mono-sm">{SLOTS[1]}</span>
                {item.text}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <div className="lw-history" data-show={step >= 3}>
          <span className="lw-mono-sm">{t("world.solo.customer")}</span>
          <div className="lw-visits" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((visit) => <i key={visit} data-new={visit === 5} />)}
          </div>
          <strong>Dawit M.</strong>
        </div>
      </div>
    </div>
  );
};

function slotState(index: number, step: number): string {
  if (index === 0) return "taken";
  if (index !== 1) return "open";
  if (step === 0) return "open";
  return step === 1 ? "held" : "booked";
}

export default SoloStage;
