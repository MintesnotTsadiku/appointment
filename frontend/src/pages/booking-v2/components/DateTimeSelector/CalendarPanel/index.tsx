/**
 * The month calendar of the booking time picker: compact enough to stay in the sticky side column.
 * Days outside the booking window or on closed weekdays are disabled; open days carry a small dot.
 */

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
  const { t, language } = useTranslation();
  const locale = intlLocale(language);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(displayMonth);
  const dates = getCalendarDates(displayMonth);
  const weeks = Array.from({ length: Math.ceil(dates.length / 7) }, (_, week) => dates.slice(week * 7, week * 7 + 7));
  const today = startOfDay(new Date());
  const selectable = (date: Date) => isSelectableDay(date, { minDate, maxDate, availableDays });
  const thisMonth = displayMonth.getFullYear() === today.getFullYear() && displayMonth.getMonth() === today.getMonth();

  const shiftMonth = (by: number) => {
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
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" className="bk-icon-btn" onClick={() => shiftMonth(-1)} disabled={thisMonth}
          aria-label={t("bookingPicker.previousMonth")}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }} aria-live="polite">{monthLabel}</h2>
        <button type="button" className="bk-icon-btn" onClick={() => shiftMonth(1)} aria-label={t("bookingPicker.nextMonth")}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div role="grid" aria-label={t("bookingPicker.calendarFor").replace("{0}", monthLabel)} className="space-y-0.5">
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
              const inMonth = date.getMonth() === displayMonth.getMonth();
              const current = isToday(date);
              return (
                <div key={isoDay(date)} role="gridcell" aria-selected={selected}>
                  <button
                    type="button"
                    data-qa="booking-date"
                    data-qa-date={isoDay(date)}
                    onClick={() => open && onDateSelect(date)}
                    disabled={!open || loading}
                    aria-pressed={selected}
                    aria-current={current ? "date" : undefined}
                    aria-label={`${date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${open ? "" : ` · ${t("bookingLayout.closedDay")}`}`}
                    className={cn(
                      "relative flex h-8 w-full items-center justify-center rounded-[0.625rem] text-sm font-medium tabular-nums transition-colors",
                      "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--accent-primary)",
                      open && !selected && "hover:bg-(--accent-primary-light)",
                      !open && "cursor-not-allowed"
                    )}
                    style={selected ? {
                      background: "var(--accent-primary)",
                      color: "var(--pe-color-on-primary, #fff)",
                      fontWeight: 700,
                    } : {
                      color: open ? (inMonth ? "var(--text-primary)" : "var(--text-secondary)") : "var(--text-subtle, var(--text-muted))",
                      opacity: open ? 1 : inMonth ? 0.45 : 0.25,
                      boxShadow: current ? "inset 0 0 0 1.5px var(--accent-primary)" : undefined,
                    }}
                  >
                    {date.getDate()}
                    {open && !selected && inMonth && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ backgroundColor: "var(--accent-success)" }} aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showQuickJumps && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 [&>.bk-chip]:min-h-8">
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
      )}
    </div>
  );
}
