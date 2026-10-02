import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { hhmm, nextOpening, reference, type Provider } from "../schedule";

const OPENS = 14 * 60;
const CLOSES = 18 * 60;
const NOW = 14 * 60 + 5;
const BUFFER = 10;
const SERVICES = [
  { key: "cut", length: 45 },
  { key: "blowdry", length: 30 },
  { key: "braids", length: 90 },
];

const START: Provider[] = [
  { name: "Selam", opens: OPENS, closes: CLOSES, bookings: [{ id: "s1", who: "Hiwot", start: 840, length: 90 }, { id: "s2", who: "Mahi", start: 960, length: 60 }] },
  { name: "Liya", opens: OPENS, closes: CLOSES, bookings: [{ id: "l1", who: "Sara", start: 855, length: 60 }, { id: "l3", who: "Bethel", start: 1005, length: 75 }] },
  { name: "Abel", opens: OPENS, closes: CLOSES, bookings: [{ id: "a1", who: "Yonas", start: 840, length: 45 }, { id: "a2", who: "Kal", start: 915, length: 45 }] },
  { name: "Tsion", opens: 15 * 60, closes: CLOSES, bookings: [{ id: "t1", who: "Eden", start: 945, length: 45 }, { id: "t2", who: "Lulit", start: 1020, length: 45 }] },
];

/** A front desk: the walk-in's service decides the next free chair across the location. */
const DeskStage = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState(START);
  const [service, setService] = useState(SERVICES[0]);
  const [ticket, setTicket] = useState<string | null>(null);
  const opening = useMemo(() => nextOpening(providers, service.length, BUFFER, NOW), [providers, service]);

  const book = () => {
    if (!opening) return;
    const id = `walk-${providers.flatMap((p) => p.bookings).length}`;
    setProviders((current) => current.map((p) => (p.name === opening.provider
      ? { ...p, bookings: [...p.bookings, { id, who: t("world.desk.walkIn"), start: opening.start, length: service.length }] }
      : p)));
    setTicket(`${hhmm(opening.start)} · ${opening.provider} · ${reference(id + opening.provider + opening.start)}`);
  };

  return (
    <div className="lw-desk">
      <div className="lw-desk-ask">
        <p className="lw-mono-sm">{t("world.desk.wants")}</p>
        <div className="lw-seg" role="group" aria-label={t("world.desk.wants")}>
          {SERVICES.map((option) => (
            <button key={option.key} type="button" aria-pressed={service.key === option.key} data-qa={`landing-desk-${option.key}`}
              onClick={() => { setService(option); setTicket(null); }}>
              {t(`world.team.${option.key}`)} · {option.length} {t("world.desk.minutes")}
            </button>
          ))}
        </div>
      </div>
      <div className="lw-desk-lanes" aria-hidden="true">
        <div className="lw-desk-hours">{[14, 15, 16, 17, 18].map((hour) => <span key={hour}>{hour}:00</span>)}</div>
        {providers.map((provider) => (
          <div key={provider.name} className="lw-desk-lane">
            <span className="lw-desk-name">{provider.name}</span>
            <div className="lw-desk-track">
              {provider.opens > OPENS && <span className="lw-desk-off" style={span(OPENS, provider.opens - OPENS)} />}
              {provider.bookings.map((item) => (
                <motion.span key={item.id} className="lw-desk-block" data-new={item.id.startsWith("walk")} style={span(item.start, item.length)}
                  initial={item.id.startsWith("walk") ? { scale: 0.6, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }}>
                  {item.who}
                </motion.span>
              ))}
              {opening?.provider === provider.name && <span className="lw-desk-ghost" style={span(opening.start, service.length)} />}
            </div>
          </div>
        ))}
        <span className="lw-desk-now" style={{ left: `calc(64px + (100% - 64px) * ${(NOW - OPENS) / (CLOSES - OPENS)})` }} />
      </div>
      <div className="lw-desk-answer">
        {!ticket && (
          <>
            <p className="lw-count" aria-live="polite" data-qa="landing-desk-next">
              {opening
                ? <><strong>{hhmm(opening.start)}</strong> {t("world.desk.with")} {opening.provider}</>
                : t("world.desk.none")}
            </p>
            <button type="button" className="lw-btn lw-btn-accent lw-btn-small" disabled={!opening} onClick={book} data-qa="landing-desk-book">
              {t("world.desk.book")}
            </button>
          </>
        )}
        {ticket && (
          <>
            <motion.p className="lw-ticket" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite" data-qa="landing-desk-ticket">
              ✓ {t("world.desk.booked")} · {ticket}
            </motion.p>
            <button type="button" className="lw-link" onClick={() => { setProviders(START); setTicket(null); }}>{t("world.desk.reset")}</button>
          </>
        )}
      </div>
    </div>
  );
};

function span(start: number, length: number) {
  return { left: ((start - OPENS) / (CLOSES - OPENS)) * 100 + "%", width: (length / (CLOSES - OPENS)) * 100 + "%" };
}

export default DeskStage;
