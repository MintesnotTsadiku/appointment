import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

interface Visit {
  time: string;
  who: string;
  cadence: "weekly" | "fortnightly" | "firstVisit";
  x: number;
  y: number;
}

const VISITS: Visit[] = [
  { time: "08:30", who: "Almaz T.", cadence: "weekly", x: 190, y: 220 },
  { time: "09:45", who: "Getachew family", cadence: "fortnightly", x: 300, y: 120 },
  { time: "11:00", who: "Tsehay W.", cadence: "weekly", x: 430, y: 180 },
  { time: "13:15", who: "Abebe K.", cadence: "firstVisit", x: 400, y: 300 },
];

const BASE = { x: 70, y: 300 };
const ROUTE = `M${BASE.x} ${BASE.y} C120 260 150 240 190 220 S260 130 300 120 S400 150 430 180 S450 270 400 300`;

/** A nurse's home-visit loop on a calm map, with today's operations pulse. */
const CareStage = () => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <div className="lw-care">
      <div className="lw-map-col">
        <svg className="lw-map" viewBox="0 0 500 360" role="img" aria-label={t("world.care.visits")}>
          <defs>
            <pattern id="lw-map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="currentColor" strokeOpacity="0.07" />
            </pattern>
          </defs>
          <rect width="500" height="360" rx="18" fill="url(#lw-map-grid)" />
          <path d="M0 80 C120 110 220 40 330 70 S470 40 500 60" className="lw-river" />
          <path d="M40 0 L120 360 M0 190 L500 250 M260 0 L340 360" className="lw-road" />
          <motion.path d={ROUTE} className="lw-route" initial={{ pathLength: reduced ? 1 : 0 }}
            whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 2.4, ease: "easeInOut" }} />
          <g className="lw-base" transform={`translate(${BASE.x} ${BASE.y})`}>
            <rect x="-16" y="-16" width="32" height="32" rx="9" />
            <path d="M-6 0H6M0 -6V6" />
          </g>
          {VISITS.map((visit, index) => (
            <g key={visit.time} className="lw-pin" transform={`translate(${visit.x} ${visit.y})`}>
              <circle r="15" />
              <text y="5" textAnchor="middle">{index + 1}</text>
            </g>
          ))}
          {!reduced && (
            <circle r="7" className="lw-carer">
              <animateMotion dur="9s" repeatCount="indefinite" path={ROUTE} rotate="auto" />
            </circle>
          )}
        </svg>
        <dl className="lw-pulse-row">
          <div><dt>{t("world.care.statVisits")}</dt><dd>18</dd></div>
          <div><dt>{t("world.care.statStaff")}</dt><dd>6</dd></div>
          <div><dt>{t("world.care.statHomes")}</dt><dd>{VISITS.length}</dd></div>
        </dl>
      </div>
      <div className="lw-visits-list">
        <p className="lw-mono-sm">{t("world.care.visits")} · Hirut</p>
        <ol>
          {VISITS.map((visit, index) => (
            <li key={visit.time}>
              <span className="lw-visit-num">{index + 1}</span>
              <span className="lw-visit-time">{visit.time}</span>
              <span className="lw-visit-who">{visit.who}</span>
              <span className="lw-tag" data-kind={visit.cadence}>{t(`world.care.${visit.cadence}`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default CareStage;
