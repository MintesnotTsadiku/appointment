import { motion } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "@/lib/i18n";

const STEPS = ["step1", "step2", "step3", "step4", "step5"];
const BOOKINGS = [38, 142, 260, 371, 486];
const TEAM = ["H", "M", "Y"];
const SPARK = "M0 34 L20 30 L40 31 L60 24 L80 26 L100 18 L120 20 L140 11 L160 13 L180 6 L200 4";

/** Hana's business grows as the visitor scrolls; each stage can be picked too. */
const GrowStage = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useScrollStep(ref, STEPS.length);
  const ownDomain = step === STEPS.length - 1;

  return (
    <div ref={ref} className="lw-grow" data-step={step}>
      <ol className="lw-steps" aria-label={t("world.grow.stepsLabel")}>
        {STEPS.map((name, index) => (
          <li key={name}>
            <button type="button" aria-current={index === step ? "step" : undefined} data-done={index < step} onClick={() => setStep(index)}>
              <span className="lw-mono-sm">0{index + 1}</span>
              {t(`world.grow.${name}`)}
            </button>
          </li>
        ))}
      </ol>
      <div className="lw-browser" aria-hidden="true">
        <div className="lw-url">
          <span className="lw-url-dots"><i /><i /><i /></span>
          <motion.span key={String(ownDomain)} className="lw-url-text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {ownDomain ? "https://hanacuts.com" : "meet.et/hana"}
          </motion.span>
        </div>
        <div className="lw-browser-body">
          <div className="lw-grow-row">
            {TEAM.slice(0, step >= 1 ? 3 : 1).map((initial) => (
              <motion.span key={initial} className="lw-avatar" layout initial={{ scale: 0 }} animate={{ scale: 1 }}>{initial}</motion.span>
            ))}
            <span className="lw-mono-sm">{t("world.grow.team")}</span>
          </div>
          <div className="lw-grow-row" data-on={step >= 2}>
            <span className="lw-chip">Bole</span>
            <span className="lw-chip">Kazanchis</span>
            <span className="lw-mono-sm">{t("world.grow.locations")}</span>
          </div>
          <div className="lw-grow-row" data-on={step >= 3}>
            <span className="lw-chip">◍ {t("world.grow.profiles")}</span>
            <span className="lw-chip">✉ {t("world.grow.reminders")}</span>
            <span className="lw-mono-sm">{t("world.status.next")}</span>
          </div>
          <div className="lw-grow-stats">
            <div>
              <motion.strong key={BOOKINGS[step]} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }}>{BOOKINGS[step]}</motion.strong>
              <span>{t("world.grow.bookings")}</span>
            </div>
            <div data-on={step >= 4}>
              <strong>72%</strong>
              <span>{t("world.grow.returning")}</span>
            </div>
            <svg viewBox="0 0 200 40" className="lw-spark" data-on={step >= 4}>
              <path d={SPARK} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Step from how far the stage has travelled through the viewport: step one
 * when its top reaches 75% of the viewport, the last once its bottom passes 35%.
 */
function useScrollStep(ref: RefObject<HTMLElement>, count: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const start = window.innerHeight * 0.75;
      const travel = box.height + window.innerHeight * 0.4;
      const progress = (start - box.top) / Math.max(1, travel);
      setStep(Math.max(0, Math.min(count - 1, Math.floor(progress * count))));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, count]);
  return [step, setStep] as const;
}

export default GrowStage;
