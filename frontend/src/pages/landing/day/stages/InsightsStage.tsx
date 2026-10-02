import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

type Period = 7 | 30 | 90;

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
/** Pretend figures for one salon; Monday is its closing day. */
const BY_PERIOD: Record<Period, { perDay: number[]; utilisation: number; noShows: number; revenue: number }> = {
  7: { perDay: [0, 14, 16, 18, 22, 27, 12], utilisation: 71, noShows: 3, revenue: 101200 },
  30: { perDay: [0, 58, 66, 79, 95, 118, 51], utilisation: 68, noShows: 11, revenue: 431300 },
  90: { perDay: [0, 171, 204, 236, 288, 351, 160], utilisation: 66, noShows: 29, revenue: 1289900 },
};

/** The owner's evening read: one period switch, four figures, bookings by weekday, and a CSV. */
const InsightsStage = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>(7);
  const data = BY_PERIOD[period];
  const bookings = data.perDay.reduce((sum, value) => sum + value, 0);
  const figures = [
    { key: "bookings", value: bookings.toLocaleString("en") },
    { key: "utilisation", value: data.utilisation + "%" },
    { key: "noShows", value: String(data.noShows) },
    { key: "revenue", value: data.revenue.toLocaleString("en") + " " + t("world.insights.currency") },
  ];

  return (
    <div className="lw-insights">
      <div className="lw-seg" role="group" aria-label={t("world.insights.period")}>
        {([7, 30, 90] as Period[]).map((option) => (
          <button key={option} type="button" aria-pressed={period === option} onClick={() => setPeriod(option)} data-qa={`landing-insights-${option}`}>
            {t(`world.insights.last${option}`)}
          </button>
        ))}
      </div>
      <dl className="lw-figures" aria-live="polite" data-qa="landing-insights-figures">
        {figures.map((figure) => (
          <div key={figure.key}>
            <dt>{t(`world.insights.${figure.key}`)}</dt>
            <motion.dd key={figure.value} initial={{ opacity: 0.3, y: 4 }} animate={{ opacity: 1, y: 0 }}>{figure.value}</motion.dd>
          </div>
        ))}
      </dl>
      <WeekdayChart perDay={data.perDay} />
      <button type="button" className="lw-btn lw-btn-accent lw-btn-small" onClick={() => downloadCsv(period, data.perDay, t)} data-qa="landing-insights-csv">
        ↓ {t("world.insights.csv")}
      </button>
    </div>
  );
};

/** Single-series bar chart: value on hover or focus, the busiest day labelled, a table for screen readers. */
const WeekdayChart = ({ perDay }: { perDay: number[] }) => {
  const { t } = useTranslation();
  const max = Math.max(...perDay);
  const [active, setActive] = useState<number | null>(null);
  const width = 336;
  const height = 150;
  const slot = width / perDay.length;
  return (
    <figure className="lw-chart">
      <figcaption className="lw-mono-sm">{t("world.insights.chart")}</figcaption>
      <svg viewBox={`0 0 ${width} ${height + 22}`} aria-hidden="true" onMouseLeave={() => setActive(null)}>
        <line x1="0" x2={width} y1={height} y2={height} className="lw-chart-base" />
        {perDay.map((value, index) => {
          const barHeight = max ? (value / max) * (height - 24) : 0;
          const x = index * slot + 7;
          const barWidth = slot - 14;
          const shown = active === index || (active === null && value === max);
          return (
            <g key={WEEKDAYS[index]} onMouseEnter={() => setActive(index)}>
              <rect x={index * slot} y="0" width={slot} height={height} fill="transparent" />
              {value > 0 && (
                <motion.path className="lw-chart-bar" data-active={active === index}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} d={roundedTop(x, height - barHeight, barWidth, barHeight)} />
              )}
              {shown && value > 0 && <text className="lw-chart-value" x={x + barWidth / 2} y={height - barHeight - 6} textAnchor="middle">{value}</text>}
              <text className="lw-chart-day" x={x + barWidth / 2} y={height + 16} textAnchor="middle">{t(`world.insights.${WEEKDAYS[index]}`)}</text>
            </g>
          );
        })}
      </svg>
      <div className="lw-chart-keys">
        {perDay.map((value, index) => (
          <button key={WEEKDAYS[index]} type="button" className="lw-chart-key" onFocus={() => setActive(index)} onBlur={() => setActive(null)}
            aria-label={`${t(`world.insights.${WEEKDAYS[index]}`)}: ${value}`} />
        ))}
      </div>
      <table className="lw-sr-only">
        <caption>{t("world.insights.chart")}</caption>
        <tbody>
          {perDay.map((value, index) => (
            <tr key={WEEKDAYS[index]}><th scope="row">{t(`world.insights.${WEEKDAYS[index]}`)}</th><td>{value}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

/** Bar with a 4px rounded top, flat on the baseline. */
function roundedTop(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, height, width / 2);
  return `M${x} ${y + height} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height} Z`;
}

function downloadCsv(period: Period, perDay: number[], t: (key: string) => string) {
  const rows = [["weekday", "bookings"], ...perDay.map((value, index) => [t(`world.insights.${WEEKDAYS[index]}`), String(value)])];
  const blob = new Blob([rows.map((row) => row.join(",")).join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `meet-et-demo-bookings-${period}-days.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default InsightsStage;
