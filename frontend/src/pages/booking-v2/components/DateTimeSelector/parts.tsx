/**
 * Parts of the booking time picker: the summary card, the strip of days for narrow screens,
 * the time format control, the booking notes, the "Your time" bar and the phone's Continue button.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarCheck2, CalendarDays, ChevronDown, Clock3, Info, Loader2 } from "lucide-react";
import { formatInstant } from "@/lib/time";
import { dayInZone, ethiopianOf, formatEthiopianDate, monthName } from "@/lib/ethiopian-calendar";
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
export function BookingSummaryCard({ eyebrow, title, titleQa, facts, children, headingLevel = 1, compact = false, media }: {
  eyebrow?: ReactNode; title: ReactNode; titleQa?: string; facts: SummaryFact[]; children?: ReactNode; headingLevel?: 1 | 2; compact?: boolean;
  /** The service photo: a small frame in the skin's shape beside the title. */
  media?: ReactNode;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={`bk-summary ${compact ? "" : "bk-card p-4"}`} data-qa="booking-summary" data-compact={compact ? "true" : "false"} data-media={media ? "true" : "false"}>
      {media && <div className="bk-summary-media">{media}</div>}
      <div className="min-w-0 space-y-2">
      {eyebrow && <p className="bk-eyebrow truncate">{eyebrow}</p>}
      <Heading className="bk-summary-title text-xl font-semibold leading-tight text-balance" data-qa={titleQa}
        style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>
        {title}
      </Heading>
      {facts.length > 0 && (
        <ul className="bk-facts flex flex-wrap gap-x-4 gap-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {facts.map((fact, index) => {
            const Icon = fact.icon;
            return (
              <li key={index} className="flex min-w-0 items-start gap-2" data-qa={fact.qa}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block" style={{ color: "var(--text-primary)" }}>{fact.text}</span>
                  {fact.detail && <span className="bk-fact-detail block text-xs leading-relaxed" title={typeof fact.detail === "string" ? fact.detail : undefined}>{fact.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {children}
      </div>
    </section>
  );
}

/** 12-hour, 24-hour or Habesha time, as one segmented control. `inline` hides the label (the slot panel header). */
export function TimeFormatControl({ value, onChange, inline = false }: { value: TimeFormat; onChange: (format: TimeFormat) => void; inline?: boolean }) {
  const { t, language } = useTranslation();
  const labelId = useId();
  const formats: Array<{ value: TimeFormat; label: string }> = [
    { value: "12h", label: t("bookingPicker.h12") },
    { value: "24h", label: t("bookingPicker.h24") },
    { value: "ethiopian", label: t("bookingLayout.habesha") },
  ];
  return (
    <div className={inline ? "bk-format-inline" : "space-y-1.5"}>
      <p id={labelId} className={inline ? "sr-only" : "bk-eyebrow"}>{t("bookingPicker.timeFormat")}</p>
      <div className="bk-segment" role="group" aria-labelledby={labelId} data-qa="booking-time-format" data-inline={inline ? "true" : "false"}>
        {formats.map((format) => (
          <button key={format.value} type="button" aria-pressed={value === format.value} onClick={() => onChange(format.value)}
            data-qa="booking-time-format-option" data-value={format.value} title={getTimeFormatExample(format.value, language)}
            aria-label={`${format.label} · ${getTimeFormatExample(format.value, language)}`}>
            <span>{format.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The time zone of the listed times, such as "Addis Ababa time". */
export function ZoneLabel({ zone, timezone, className = "" }: { zone: string; timezone: string; className?: string }) {
  return <span className={`min-w-0 truncate ${className}`} data-qa="booking-zone" title={timezone}>{zone}</span>;
}

/**
 * The booking notes behind a small button. They open in a popover above the button, so opening them
 * never makes the side column taller. The popover stays inside the page (no portal) to keep the brand tokens.
 */
export function BookingInfo({ zone, side = "top" }: { zone: string; side?: "top" | "bottom" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="bk-link shrink-0" data-qa="booking-info">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />{t("bookingPicker.infoTitle")}
          <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open === (side === "bottom") ? "rotate(180deg)" : undefined }} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content side={side} align="start" sideOffset={8} collisionPadding={12} className="bk-popover" data-qa="booking-info-notes">
        <ul className="list-disc space-y-1 ps-5 text-xs leading-relaxed">
          <li>{t("bookingPicker.infoTimezone").replace("{0}", zone)}</li>
          <li>{t("bookingPicker.infoSave")}</li>
          <li>{t("bookingPicker.infoContact")}</li>
        </ul>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
}

interface StripProps {
  /** Habesha time: Ethiopian day numbers and month names. */
  ethiopian?: boolean;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableDays?: number[];
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
}

const STRIP_DAYS = 60;

/** Narrow screens: the next days as a row of chips that scrolls sideways. */
export function DateStrip({ selectedDate, onDateSelect, availableDays, minDate, maxDate, loading, ethiopian = false }: StripProps) {
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
        const local = ethiopian ? ethiopianOf(day) : null;
        return (
          <button key={isoDay(day)} type="button" className="bk-day" data-qa="booking-date" data-qa-date={isoDay(day)} data-qa-day={local ? local.day : day.getDate()}
            disabled={!open || loading} aria-pressed={chosen} onClick={() => onDateSelect(day)}
            aria-label={`${local ? formatEthiopianDate(day, language) : day.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}${open ? "" : ` · ${t("bookingLayout.closedDay")}`}`}
            title={local ? `${monthName(local.month, language)} ${local.day}` : monthDay.format(day)}>
            <small>{weekday.format(day)}</small>
            <strong>{local ? local.day : day.getDate()}</strong>
          </button>
        );
      })}
    </div>
  );
}

export interface BarAction { label: string; onClick: () => void; busy?: boolean; disabled?: boolean; qa?: string }

/** "Thu, Oct 15 · 3:00 PM" and "With Selam Bekele" for a chosen slot, in the picker's clock and zone. */
function useChosenText(slot: TimeSlot | null, timeFormat: TimeFormat, timezone: string) {
  const { t, language } = useTranslation();
  if (!slot) return null;
  const start = new Date(slot.start_time);
  // Habesha time: the Ethiopian date of the time's day where the business is ("ሐሙስ፣ ጥቅምት 5 ቀን 2019").
  const day = timeFormat === "ethiopian"
    ? formatEthiopianDate(dayInZone(start, timezone || undefined), language, { weekday: "short" })
    : new Intl.DateTimeFormat(intlLocale(language), { weekday: "short", day: "numeric", month: "short", timeZone: timezone || undefined }).format(start);
  const time = formatInstant(start, timeFormat, timezone, { language, style: "phrase" });
  const who = slot.provider?.name ? t("bookingPicker.with").replace("{0}", shortProviderName(slot.provider.name)) : "";
  return { day, time, who };
}

function GoButton({ action, className = "" }: { action: BarAction; className?: string }) {
  return (
    <button type="button" className={`bk-bar-go ${className}`} data-qa={action.qa ?? "booking-continue"} onClick={action.onClick} disabled={action.busy || action.disabled}>
      {action.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {action.label}
      {!action.busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

/**
 * "Your time": a bar at the top of the slot panel (wide) or at the foot of the sticky strip (narrow).
 * Before a choice it says "Pick a time" at the same height, so nothing moves when the customer chooses.
 * With `action`, the next step is in the bar; on phones the page shows it at the bottom instead (`PhoneContinue`).
 */
export function YourTime({ slot, timeFormat, timezone, detail, action, variant }: {
  slot: TimeSlot | null; timeFormat: TimeFormat; timezone: string; detail?: string; action?: BarAction; variant: "panel" | "strip";
}) {
  const { t } = useTranslation();
  const chosen = useChosenText(slot, timeFormat, timezone);
  const line = chosen ? [chosen.day, chosen.time, chosen.who, detail].filter(Boolean) : [];
  return (
    <div className="bk-when" data-variant={variant} data-state={chosen ? "chosen" : "empty"} data-qa={chosen ? "booking-bar" : "booking-bar-empty"}>
      <span className="bk-when-mark" aria-hidden="true">{chosen ? <CalendarCheck2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1" aria-live="polite">
        {variant === "panel" && <p className="bk-eyebrow">{t("public.independentBooking.chosenTime")}</p>}
        {chosen ? (
          <p className="bk-when-text" data-qa="booking-bar-when" title={line.join(" · ")}>
            {variant === "strip" && <span className="sr-only">{t("public.independentBooking.chosenTime")}: </span>}
            <strong>{chosen.day} · <span className="tabular-nums">{chosen.time}</span></strong>
            {line.length > 2 && <span className="bk-when-more"> · {line.slice(2).join(" · ")}</span>}
          </p>
        ) : (
          <p className="bk-when-text bk-when-empty">
            {variant === "strip" && <span className="bk-when-label">{t("public.independentBooking.chosenTime")} · </span>}
            {t("bookingLayout.pickTime")}
          </p>
        )}
      </div>
      {action && chosen && <GoButton action={action} />}
    </div>
  );
}

/**
 * Phones: Continue at the bottom of the screen, in the thumb's reach. The chosen time is in the
 * "Your time" row at the top, so this bar holds the button only.
 */
export function PhoneContinue({ slot, timeFormat, timezone, action }: { slot: TimeSlot; timeFormat: TimeFormat; timezone: string; action: BarAction }) {
  const chosen = useChosenText(slot, timeFormat, timezone);
  return (
    <div className="bk-bar" data-qa="booking-phone-continue">
      <div className="bk-bar-inner">
        <p className="bk-bar-time tabular-nums" aria-hidden="true">{chosen?.time}</p>
        <GoButton action={action} className="flex-1" />
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
