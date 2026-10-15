/**
 * The month calendar of the booking time picker: compact enough to stay in the side column.
 * Days outside the booking window or on closed weekdays are disabled; open days carry a small dot.
 * `MonthGrid` draws the days of any calendar (the Gregorian one here, the Ethiopian one in
 * `EthiopianCalendar`), so both look and behave the same. Arrow keys move between days, Home and End
 * go to the start and the end of the week, Page Up and Page Down change the month.
 */

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { getCalendarDates, isToday, isSameDay, startOfDay, addDays } from "../../../utils/dateHelpers";
import type { CalendarProps } from "../../../types";

// 2023-01-01 was a Sunday; seven days from it give the weekday names in any locale.
const weekdayLabels = (locale: string) =>
  Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2023, 0, 1 + day)));

/** `YYYY-MM-DD` in local time, the value browser QA uses to pick a day. */
export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Whether a day can be booked: inside the window and on an open weekday. */
export function isSelectableDay(date: Date, { minDate, maxDate, availableDays = [0, 1, 2, 3, 4, 5, 6] }: Pick<CalendarProps, "minDate" | "maxDate" | "availableDays">) {
  const today = startOfDay(new Date());
  const min = minDate && startOfDay(minDate) > today ? startOfDay(minDate) : today;
  const time = startOfDay(date).getTime();
  if (time < min.getTime()) return false;
  if (maxDate && time > startOfDay(maxDate).getTime()) return false;
  return availableDays.includes(date.getDay());
}

export interface MonthGridProps {
  /** The visible weeks, Sunday first. */
  weeks: Date[][];
  /** Whether a day belongs to the visible month (other days are dimmed). */
  inMonth: (date: Date) => boolean;
  /** The day as the number in its cell. */
  dayNumber: (date: Date) => number;
  /** The full date for screen readers. */
  dayLabel: (date: Date) => string;
  /** The month and year, for the grid's name. */
  monthLabel: string;
  selectedDate: Date | null;
  selectable: (date: Date) => boolean;
  onDateSelect: (date: Date) => void;
  /** Moves the visible month (Page Up and Page Down, or an arrow key past the edge). */
  onShiftMonth: (step: number) => void;
  loading?: boolean;
  calendar: "gregorian" | "ethiopian";
}

/** The weekday header and the day cells of one month. */
export function MonthGrid({ weeks, inMonth, dayNumber, dayLabel, monthLabel, selectedDate, selectable, onDateSelect, onShiftMonth, loading, calendar }: MonthGridProps) {
  const { t, language } = useTranslation();
  const locale = intlLocale(language);
  const grid = useRef<HTMLDivElement>(null);
  // After a keyboard move into another month, focus the target day once the new month renders.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    const target = grid.current?.querySelector<HTMLButtonElement>(`[data-qa-date="${key}"]`);
    if (target) { target.focus(); pendingFocus.current = null; }
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-qa-date]");
    const current = button?.dataset.qaDate;
    if (!current) return;
    const [year, month, day] = current.split("-").map(Number);
    const from = new Date(year, month - 1, day);
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -from.getDay(), End: 6 - from.getDay() };
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      onShiftMonth(event.key === "PageUp" ? -1 : 1);
      return;
    }
    if (!(event.key in steps)) return;
    event.preventDefault();
    const target = addDays(from, steps[event.key]);
    const key = isoDay(target);
    const found = grid.current?.querySelector<HTMLButtonElement>(`[data-qa-date="${key}"]`);
    // Disabled days cannot take focus; the move goes on to them only to change the month.
    if (found && !found.disabled && inMonth(target)) { found.focus(); return; }
    if (!inMonth(target)) {
      pendingFocus.current = key;
      onShiftMonth(target > from ? 1 : -1);
    } else if (found) {
      pendingFocus.current = null;
    }
  };

  return (
    <div ref={grid} role="grid" aria-label={t("bookingPicker.calendarFor").replace("{0}", monthLabel)} className="space-y-0.5" onKeyDown={onKeyDown} data-calendar={calendar}>
      <div role="row" className="grid grid-cols-7 gap-1">
        {weekdayLabels(locale).map((day) => (
          <div key={day} role="columnheader" className="flex h-6 items-center justify-center text-[0.6875rem] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, row) => (
        <div key={row} role="row" className="grid grid-cols-7 gap-1">
          {week.map((date) => {
            const open = selectable(date);
            const selected = Boolean(selectedDate && isSameDay(date, selectedDate));
            const visible = inMonth(date);
            const current = isToday(date);
            return (
              <div key={isoDay(date)} role="gridcell" aria-selected={selected}>
                <button
                  type="button"
                  data-qa="booking-date"
                  data-qa-date={isoDay(date)}
                  data-qa-day={dayNumber(date)}
                  onClick={() => open && onDateSelect(date)}
                  disabled={!open || loading}
                  aria-pressed={selected}
                  aria-current={current ? "date" : undefined}
                  aria-label={`${dayLabel(date)}${open ? "" : ` · ${t("bookingLayout.closedDay")}`}`}
                  className={cn(
                    "bk-cal-day relative flex w-full items-center justify-center rounded-[0.625rem] text-sm font-medium tabular-nums transition-colors",
                    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--accent-primary)",
                    open && !selected && "hover:bg-(--accent-primary-light)",
                    !open && "cursor-not-allowed"
                  )}
                  style={selected ? {
                    background: "var(--accent-primary)",
                    color: "var(--pe-color-on-primary, #fff)",
                    fontWeight: 700,
                  } : {
                    color: open ? (visible ? "var(--text-primary)" : "var(--text-secondary)") : "var(--text-subtle, var(--text-muted))",
                    opacity: open ? 1 : visible ? 0.45 : 0.25,
                    boxShadow: current ? "inset 0 0 0 1.5px var(--accent-primary)" : undefined,
                  }}
                >
                  {dayNumber(date)}
                  {open && !selected && visible && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ backgroundColor: "var(--accent-success)" }} aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The month name between the previous and next month buttons. */
export function MonthHeader({ label, onShift, previousDisabled }: { label: ReactNode; onShift: (step: number) => void; previousDisabled: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="bk-cal-head mb-1.5 flex items-center justify-between gap-2">
      <button type="button" className="bk-icon-btn" onClick={() => onShift(-1)} disabled={previousDisabled} aria-label={t("bookingPicker.previousMonth")} data-qa="booking-month-previous">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }} aria-live="polite" data-qa="booking-month">{label}</h2>
      <button type="button" className="bk-icon-btn" onClick={() => onShift(1)} aria-label={t("bookingPicker.nextMonth")} data-qa="booking-month-next">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Today, Tomorrow and Next week. */
export function QuickJumps({ selectable, loading, jump }: { selectable: (date: Date) => boolean; loading: boolean; jump: (date: Date) => void }) {
  const { t } = useTranslation();
  const today = startOfDay(new Date());
  return (
    <div className="bk-cal-jumps mt-2 flex flex-wrap gap-1.5">
      <button type="button" className="bk-chip" data-qa="booking-today" disabled={loading || !selectable(today)} onClick={() => jump(new Date())}>
        {t("bookingPicker.today")}
      </button>
      <button type="button" className="bk-chip" data-qa="booking-tomorrow" disabled={loading || !selectable(addDays(today, 1))} onClick={() => jump(addDays(today, 1))}>
        {t("bookingPicker.tomorrow")}
      </button>
      <button type="button" className="bk-chip" disabled={loading || !selectable(addDays(today, 7))} onClick={() => jump(addDays(today, 7))}>
        {t("bookingPicker.nextWeek")}
      </button>
    </div>
  );
}

export function CalendarPanel({
  selectedDate,
  displayMonth,
  onDateSelect,
  onMonthChange,
  availableDays = [0, 1, 2, 3, 4, 5, 6],
  minDate,
  maxDate,
  loading = false,
  className,
  showQuickJumps = true,
}: CalendarProps & { showQuickJumps?: boolean }) {
  const { language } = useTranslation();
  const locale = intlLocale(language);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(displayMonth);
  const dates = getCalendarDates(displayMonth);
  const weeks = Array.from({ length: Math.ceil(dates.length / 7) }, (_, week) => dates.slice(week * 7, week * 7 + 7));
  const today = startOfDay(new Date());
  const selectable = (date: Date) => isSelectableDay(date, { minDate, maxDate, availableDays });
  const thisMonth = displayMonth.getFullYear() === today.getFullYear() && displayMonth.getMonth() === today.getMonth();

  const shiftMonth = (by: number) => {
    if (by < 0 && thisMonth) return;
    const next = new Date(displayMonth);
    next.setDate(1);
    next.setMonth(next.getMonth() + by);
    onMonthChange(next);
  };
  const jump = (date: Date) => {
    onDateSelect(date);
    onMonthChange(date);
  };

  return (
    <div className={cn("bk-cal w-full", className)} data-qa="booking-calendar" data-calendar="gregorian">
      <MonthHeader label={monthLabel} onShift={shiftMonth} previousDisabled={thisMonth} />
      <MonthGrid weeks={weeks} inMonth={(date) => date.getMonth() === displayMonth.getMonth()} dayNumber={(date) => date.getDate()}
        dayLabel={(date) => date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        monthLabel={monthLabel} selectedDate={selectedDate} selectable={selectable} onDateSelect={onDateSelect} onShiftMonth={shiftMonth}
        loading={loading} calendar="gregorian" />
      {showQuickJumps && <QuickJumps selectable={selectable} loading={loading} jump={jump} />}
    </div>
  );
}
