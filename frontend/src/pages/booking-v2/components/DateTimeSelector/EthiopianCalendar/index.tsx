/**
 * The Ethiopian month calendar of the booking time picker, shown with Habesha time. Thirteen months
 * (Pagume has five days, six in a leap year), Ethiopian day numbers and month names (Amharic on Amharic
 * pages, the usual transliteration on English pages). Every cell is the same Gregorian day underneath, so
 * open days, today, past days and the chosen day are exactly those of the Gregorian calendar, and the
 * page and the API keep Gregorian dates. Same look and keys as `CalendarPanel`.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { ethiopianMonthGrid, ethiopianMonthLabel, ethiopianOf, formatEthiopianDate, fromEthiopian, shiftEthiopianMonth, type EthiopianMonth } from "@/lib/ethiopian-calendar";
import { startOfDay } from "../../../utils/dateHelpers";
import type { CalendarProps } from "../../../types";
import { MonthGrid, MonthHeader, QuickJumps, isSelectableDay } from "../CalendarPanel";

const monthOf = (date: Date): EthiopianMonth => {
  const { year, month } = ethiopianOf(date);
  return { year, month };
};

export function EthiopianCalendar({
  selectedDate,
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
  const [view, setView] = useState<EthiopianMonth>(() => monthOf(selectedDate ?? new Date()));
  // A day chosen elsewhere (the strip, the next-day button) brings its month into view.
  const selectedKey = selectedDate ? startOfDay(selectedDate).getTime() : 0;
  useEffect(() => {
    if (selectedDate) setView(monthOf(selectedDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const today = monthOf(new Date());
  const atStart = view.year * 13 + view.month <= today.year * 13 + today.month;
  const selectable = (date: Date) => isSelectableDay(date, { minDate, maxDate, availableDays });
  const shift = (step: number) => {
    if (step < 0 && atStart) return;
    const next = shiftEthiopianMonth(view, step);
    setView(next);
    onMonthChange(fromEthiopian({ ...next, day: 1 }));
  };
  const jump = (date: Date) => {
    onDateSelect(date);
    setView(monthOf(date));
  };
  const label = ethiopianMonthLabel(view, language);

  return (
    <div className={cn("bk-cal w-full", className)} data-qa="booking-calendar" data-calendar="ethiopian"
      data-qa-month={`${view.year}-${view.month}`}>
      <MonthHeader label={label} onShift={shift} previousDisabled={atStart} />
      <MonthGrid weeks={ethiopianMonthGrid(view)}
        inMonth={(date) => { const e = ethiopianOf(date); return e.year === view.year && e.month === view.month; }}
        dayNumber={(date) => ethiopianOf(date).day}
        dayLabel={(date) => formatEthiopianDate(date, language)}
        monthLabel={label} selectedDate={selectedDate} selectable={selectable} onDateSelect={onDateSelect} onShiftMonth={shift}
        loading={loading} calendar="ethiopian" />
      {showQuickJumps && <QuickJumps selectable={selectable} loading={loading} jump={jump} />}
    </div>
  );
}
