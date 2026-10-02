import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { hhmm, moveBooking, type Provider } from "../schedule";

const OPENS = 15 * 60;
const CLOSES = 19 * 60;
const TARGET = "hirut";
const START: Provider = {
  name: "Rahel",
  opens: OPENS,
  closes: CLOSES,
  bookings: [
    { id: "abebe", who: "Abebe", start: 930, length: 45 },
    { id: TARGET, who: "Hirut", start: 1020, length: 60 },
    { id: "yonas", who: "Yonas", start: 1110, length: 45 },
  ],
};

interface Entry {
  id: number;
  key: string;
  time?: string;
  refused: boolean;
}

/** One stylist's afternoon: move or cancel a booking; every attempt lands in its history. */
const MovesStage = () => {
  const { t } = useTranslation();
  const [provider, setProvider] = useState(START);
  const [cancelled, setCancelled] = useState(false);
  const [stale, setStale] = useState(false);
  const [history, setHistory] = useState<Entry[]>([{ id: 0, key: "bookedOnline", refused: false }]);
  const target = provider.bookings.find((item) => item.id === TARGET)!;
  const log = (key: string, time?: string, refused = false) =>
    setHistory((items) => [{ id: items.length, key, time, refused }, ...items].slice(0, 5));

  const move = (delta: number) => {
    if (stale) return log("stale", undefined, true);
    const result = moveBooking(provider, TARGET, delta);
    if (result.outcome === "moved") {
      setProvider(result.provider);
      return log("movedTo", hhmm(target.start + delta));
    }
    log(result.outcome, hhmm(target.start + delta), true);
  };
  const toggleCancel = () => {
    if (stale) return log("stale", undefined, true);
    setCancelled(!cancelled);
    log(cancelled ? "restored" : "cancelled");
  };

  return (
    <div className="lw-moves">
      <div className="lw-moves-day" aria-hidden="true">
        {[15, 16, 17, 18, 19].map((hour) => (
          <span key={hour} className="lw-moves-hour" style={{ top: ((hour * 60 - OPENS) / (CLOSES - OPENS)) * 100 + "%" }}>{hour}:00</span>
        ))}
        {provider.bookings.map((item) => (
          <motion.span key={item.id} layout className="lw-moves-block" data-target={item.id === TARGET} data-cancelled={item.id === TARGET && cancelled}
            style={{ top: ((item.start - OPENS) / (CLOSES - OPENS)) * 100 + "%", height: (item.length / (CLOSES - OPENS)) * 100 + "%" }}>
            {item.who} · {hhmm(item.start)}
          </motion.span>
        ))}
      </div>
      <div className="lw-moves-panel">
        <p className="lw-mono-sm">{t("world.moves.booking")}: Hirut · {hhmm(target.start)}–{hhmm(target.start + target.length)}</p>
        <div className="lw-row">
          <button type="button" className="lw-btn lw-btn-accent lw-btn-small" onClick={() => move(-30)} disabled={cancelled} data-qa="landing-moves-earlier">{t("world.moves.earlier")}</button>
          <button type="button" className="lw-btn lw-btn-accent lw-btn-small" onClick={() => move(30)} disabled={cancelled} data-qa="landing-moves-later">{t("world.moves.later")}</button>
          <button type="button" className="lw-btn lw-btn-ghost-ink lw-btn-small" onClick={toggleCancel} data-qa="landing-moves-cancel">
            {t(cancelled ? "world.moves.restore" : "world.moves.cancel")}
          </button>
        </div>
        <div className="lw-row lw-moves-stale">
          {stale
            ? <button type="button" className="lw-link" onClick={() => { setStale(false); log("reloaded"); }} data-qa="landing-moves-reload">{t("world.moves.reload")}</button>
            : <button type="button" className="lw-link" onClick={() => setStale(true)} data-qa="landing-moves-colleague">{t("world.moves.colleague")}</button>}
        </div>
        <p className="lw-mono-sm">{t("world.moves.history")}</p>
        <ol className="lw-moves-history" aria-live="polite" data-qa="landing-moves-history">
          <AnimatePresence initial={false}>
            {history.map((entry) => (
              <motion.li key={entry.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} data-refused={entry.refused}>
                {entry.refused ? "✕ " : "✓ "}{entryText(entry, t)}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
};

/** "Moved to 16:30" for moves; "17:30: That time is taken" for refusals with a time. */
function entryText(entry: Entry, t: (key: string) => string): string {
  const text = t(`world.moves.${entry.key}`);
  if (!entry.time) return text;
  return entry.refused ? `${entry.time}: ${text}` : `${text} ${entry.time}`;
}

export default MovesStage;
