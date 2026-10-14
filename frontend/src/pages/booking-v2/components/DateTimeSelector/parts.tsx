/**
 * Parts of the booking time picker: the summary card, the strip of days for narrow screens,
 * the time format control, the notes disclosure and the bottom bar with the chosen time.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarCheck2, CalendarDays, ChevronDown, Info, Loader2 } from "lucide-react";
import { formatInstant } from "@/lib/time";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { getTimeFormatExample } from "../../utils/ethiopianTime";
import { addDays, isSameDay, startOfDay } from "../../utils/dateHelpers";
import { isoDay, isSelectableDay } from "./CalendarPanel";
import { shortProviderName } from "./TimeSlotsPanel";
import type { TimeFormat, TimeSlot } from "../../types";

export interface SummaryFact {
  icon: LucideIcon;
  text: ReactNode;
  /** A second, quieter line, such as an office address. */
  detail?: ReactNode;
  qa?: string;
}

/** What is being booked: the service as the page heading, then duration, provider and place. */
export function BookingSummaryCard({ eyebrow, title, titleQa, facts, children, headingLevel = 1, compact = false }: {
  eyebrow?: ReactNode; title: ReactNode; titleQa?: string; facts: SummaryFact[]; children?: ReactNode; headingLevel?: 1 | 2; compact?: boolean;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={compact ? "space-y-2.5" : "bk-card space-y-2.5 p-4 sm:p-5"} data-qa="booking-summary">
      {eyebrow && <p className="bk-eyebrow truncate">{eyebrow}</p>}
      <Heading className="text-xl font-semibold leading-tight text-balance" data-qa={titleQa}
        style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>
        {title}
      </Heading>
      {facts.length > 0 && (
        <ul className={compact ? "flex flex-wrap gap-x-4 gap-y-1.5 text-sm" : "space-y-2 text-sm"} style={{ color: "var(--text-secondary)" }}>
          {facts.map((fact, index) => {
            const Icon = fact.icon;
            return (
              <li key={index} className="flex min-w-0 items-start gap-2" data-qa={fact.qa}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block" style={{ color: "var(--text-primary)" }}>{fact.text}</span>
                  {fact.detail && <span className="block text-xs leading-relaxed">{fact.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {children}
    </section>
  );
}

/** 12-hour, 24-hour or Habesha time, as one segmented control. */
export function TimeFormatControl({ value, onChange }: { value: TimeFormat; onChange: (format: TimeFormat) => void }) {
  const { t } = useTranslation();
  const labelId = useId();
  const formats: Array<{ value: TimeFormat; label: string }> = [
    { value: "12h", label: t("bookingPicker.h12") },
    { value: "24h", label: t("bookingPicker.h24") },
    { value: "ethiopian", label: t("bookingLayout.habesha") },
  ];
  return (
    <div className="space-y-1.5">
      <p id={labelId} className="bk-eyebrow">{t("bookingPicker.timeFormat")}</p>
      <div className="bk-segment" role="group" aria-labelledby={labelId} data-qa="booking-time-format">
        {formats.map((format) => (
          <button key={format.value} type="button" aria-pressed={value === format.value} onClick={() => onChange(format.value)}
            data-qa="booking-time-format-option" data-value={format.value} title={getTimeFormatExample(format.value)}
            aria-label={`${format.label} · ${getTimeFormatExample(format.value)}`}>
            <span>{format.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The time zone line with the booking notes behind a disclosure, so they stay out of the way. */
export function TimeZoneNotes({ zone, timezone }: { zone: string; timezone: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const notesId = useId();
  return (
    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate" data-qa="booking-zone" title={timezone}>{zone}</span>
        <button type="button" className="bk-link shrink-0" aria-expanded={open} aria-controls={notesId} onClick={() => setOpen(!open)} data-qa="booking-info">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />{t("bookingPicker.infoTitle")}
          <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden="true" />
        </button>
      </div>
      <ul id={notesId} hidden={!open} className="mt-2 list-disc space-y-1 ps-5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }} data-qa="booking-info-notes">
        <li>{t("bookingPicker.infoTimezone").replace("{0}", zone)}</li>
        <li>{t("bookingPicker.infoSave")}</li>
        <li>{t("bookingPicker.infoContact")}</li>
      </ul>
    </div>
  );
}

interface StripProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableDays?: number[];
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
}

const STRIP_DAYS = 60;

/** Narrow screens: the next days as a row of chips that scrolls sideways. */
export function DateStrip({ selectedDate, onDateSelect, availableDays, minDate, maxDate, loading }: StripProps) {
  const { t, language } = useTranslation();
  const locale = intlLocale(language);
  const row = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());
  const first = minDate && startOfDay(minDate) > today ? startOfDay(minDate) : today;
  const start = selectedDate && startOfDay(selectedDate) < first ? startOfDay(selectedDate) : first;
  const days = Array.from({ length: STRIP_DAYS }, (_, index) => addDays(start, index))
    .filter((day) => !maxDate || startOfDay(day) <= startOfDay(maxDate));
  // A day picked from the month calendar beyond the strip joins it at the end.
  if (selectedDate && !days.some((day) => isSameDay(day, selectedDate))) days.push(startOfDay(selectedDate));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthDay = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  // Keep the chosen day in view without moving the page.
  const selectedKey = selectedDate ? isoDay(selectedDate) : "";
  useEffect(() => {
    const container = row.current;
    const chip = container?.querySelector<HTMLElement>(`[data-qa-date="${selectedKey}"]`);
    if (!container || !chip) return;
    container.scrollLeft = Math.max(0, chip.offsetLeft - container.clientWidth / 2 + chip.clientWidth / 2);
  }, [selectedKey]);

  return (
    <div ref={row} className="bk-days" role="group" aria-label={t("bookingLayout.days")}>
      {days.map((day) => {
        const open = isSelectableDay(day, { minDate, maxDate, availableDays });
        const chosen = Boolean(selectedDate && isSameDay(day, selectedDate));
        return (
          <button key={isoDay(day)} type="button" className="bk-day" data-qa="booking-date" data-qa-date={isoDay(day)}
            disabled={!open || loading} aria-pressed={chosen} onClick={() => onDateSelect(day)}
            aria-label={`${day.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}${open ? "" : ` · ${t("bookingLayout.closedDay")}`}`}
            title={monthDay.format(day)}>
            <small>{weekday.format(day)}</small>
            <strong>{day.getDate()}</strong>
          </button>
        );
      })}
    </div>
  );
}

/** The fixed bar: the chosen day, time and provider, and the next step. */
export function SelectionBar({ slot, timeFormat, timezone, detail, action }: {
  slot: TimeSlot; timeFormat: TimeFormat; timezone: string; detail?: string;
  action: { label: string; onClick: () => void; busy?: boolean; disabled?: boolean; qa?: string };
}) {
  const { t, language } = useTranslation();
  const start = new Date(slot.start_time);
  const day = new Intl.DateTimeFormat(intlLocale(language), { weekday: "short", day: "numeric", month: "short", timeZone: timezone || undefined }).format(start);
  const time = formatInstant(start, timeFormat, timezone);
  const who = slot.provider?.name ? t("bookingPicker.with").replace("{0}", shortProviderName(slot.provider.name)) : "";
  return (
    <div className="bk-bar" data-qa="booking-bar">
      <div className="bk-bar-track">
      <div className="bk-bar-inner">
        <span className="bk-bar-mark" aria-hidden="true"><CalendarCheck2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="bk-eyebrow hidden sm:block">{t("public.independentBooking.chosenTime")}</p>
          <p className="truncate text-[0.95rem] font-semibold sm:text-base" data-qa="booking-bar-when">
            {day} · <span className="tabular-nums">{time}</span>{who && <span className="hidden sm:inline"> · {who}</span>}
          </p>
          {(who || detail) && (
            <p className="truncate text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
              {who && <span className="sm:hidden">{who}{detail ? " · " : ""}</span>}{detail}
            </p>
          )}
        </div>
        <button type="button" className="bk-bar-go" data-qa={action.qa ?? "booking-continue"} onClick={action.onClick} disabled={action.busy || action.disabled}>
          {action.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {action.label}
          {!action.busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      </div>
    </div>
  );
}

/** Narrow screens: the month and a button that opens the full calendar in place of the strip. */
export function StripHeader({ month, open, onToggle, onToday, onTomorrow, todayOpen, tomorrowOpen }: {
  month: string; open: boolean; onToggle: () => void; onToday: () => void; onTomorrow: () => void; todayOpen: boolean; tomorrowOpen: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button type="button" className="bk-link text-sm" onClick={onToggle} aria-expanded={open} data-qa="booking-calendar-toggle">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        <span style={{ color: "var(--text-primary)" }}>{month}</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden="true" />
        <span className="sr-only">{open ? t("bookingLayout.hideCalendar") : t("bookingLayout.showCalendar")}</span>
      </button>
      {!open && (
        <div className="flex gap-1.5">
          <button type="button" className="bk-chip" style={{ minHeight: "2rem" }} data-qa="booking-today" disabled={!todayOpen} onClick={onToday}>{t("bookingPicker.today")}</button>
          <button type="button" className="bk-chip" style={{ minHeight: "2rem" }} data-qa="booking-tomorrow" disabled={!tomorrowOpen} onClick={onTomorrow}>{t("bookingPicker.tomorrow")}</button>
        </div>
      )}
    </div>
  );
}
