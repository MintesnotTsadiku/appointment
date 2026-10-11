import { motion } from "framer-motion";
import { useBrandedTranslation } from "@/lib/platform-brand";
import { fill, freeDetailKey } from "../../shared/offer";
import { useLandingOffer } from "../../shared/useLandingOffer";

/**
 * The three promises: free to start, live in N minutes, Amharic everywhere.
 * `full` shows the figures and details (dawn); `compact` is one line (night).
 */
const Promises = ({ variant = "full" }: { variant?: "full" | "compact" }) => {
  const { t } = useBrandedTranslation();
  const offer = useLandingOffer();
  const values = { minutes: offer.liveMinutes, count: offer.freeBookings };
  const items = [
    { id: "free", figure: t("world.promise.freeFigure"), label: t("world.promise.freeLabel"), detail: t(freeDetailKey(offer)) },
    { id: "live", figure: t("world.promise.liveFigure"), label: t("world.promise.liveLabel"), detail: t("world.promise.liveDetail") },
    { id: "amharic", figure: t("world.promise.amharicFigure"), label: t("world.promise.amharicLabel"), detail: t("world.promise.amharicDetail") },
  ].map((item) => ({ ...item, figure: fill(item.figure, values), label: fill(item.label, values), detail: fill(item.detail, values) }));

  if (variant === "compact") {
    return (
      <ul className="lw-promise-line" data-qa="landing-promise-compact">
        {items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    );
  }

  return (
    <section className="lw-promise" aria-labelledby="lw-promise-title" data-qa="landing-promise">
      <h2 id="lw-promise-title" className="lw-sr-only">{t("world.promise.title")}</h2>
      <ul>
        {items.map((item, order) => (
          <motion.li
            key={item.id}
            data-qa={`landing-promise-${item.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + order * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="lw-promise-figure" lang={item.id === "amharic" ? "am" : undefined}>{item.figure}</span>
            <span className="lw-promise-label">{item.label}</span>
            <span className="lw-promise-detail" data-loaded={offer.loaded || item.id !== "free"}>{item.detail}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
};

export default Promises;
