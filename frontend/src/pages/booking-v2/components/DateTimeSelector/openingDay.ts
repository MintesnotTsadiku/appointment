/**
 * The day the time picker opens on: the page's first day (today) when it still has an open time, else the
 * next open day, with a note that says so ("No times left today — showing Fri, Oct 16").
 * See docs/growth/BOOKING_LAYOUT.md, "The first day".
 *
 * The picker steps one open day at a time (by the calendar rules: open weekdays, the booking window) and
 * stops at the first day whose list has an open time. It only decides that a day is empty when the page has
 * handed it a new list after the day changed (pages keep the previous day's list while the next one loads),
 * so a page that has not asked for slots yet never moves. Any day the customer chooses ends it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { startOfDay } from "../../utils/dateHelpers";

/** How far the picker looks for an open day before it gives up and stays on the first day. */
const MAX_STEPS = 31;

export interface OpeningNote {
  /** The first day: today, or the page's own first day. */
  from: Date;
  /** The day shown instead. */
  to: Date;
}

interface OpeningDayOptions {
  selectedDate: Date | null;
  /** The page's list of slots; a new list (a new array) is the answer for the shown day. */
  list: unknown;
  /** Whether the shown day's list (as the customer sees it) has an open time. */
  hasOpenTime: boolean;
  loading: boolean;
  /** The first open day by the calendar rules on or after today, or null. */
  firstOpen: Date | null;
  /** The next open day by the calendar rules after a day, or null. */
  nextOpenDay: (from: Date) => Date | null;
  /** Shows a day without counting as the customer's choice. */
  show: (date: Date) => void;
  enabled: boolean;
}

const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

export function useOpeningDay({ selectedDate, list, hasOpenTime, loading, firstOpen, nextOpenDay, show, enabled }: OpeningDayOptions) {
  const [note, setNote] = useState<OpeningNote | null>(null);
  // Renders the picker again when the search ends on the day already shown.
  const [, setEnded] = useState(false);
  const state = useRef({ active: enabled, origin: null as Date | null, day: null as Date | null, list: null as unknown, steps: 0 });
  // The latest callbacks, so the effects below run on the picker's state only.
  const latest = useRef({ nextOpenDay, show });
  latest.current = { nextOpenDay, show };

  /** The customer chose a day: keep it, and drop the note. */
  const release = useCallback(() => {
    state.current.active = false;
    setNote(null);
  }, []);

  // No day yet (independent booking, reschedule): open on today, or on the first open day.
  useEffect(() => {
    const current = state.current;
    if (!current.active || selectedDate || !firstOpen) return;
    const today = startOfDay(new Date());
    current.origin = today;
    if (!sameDay(firstOpen, today)) setNote({ from: today, to: firstOpen });
    latest.current.show(firstOpen);
  }, [selectedDate, firstOpen]);

  useEffect(() => {
    const current = state.current;
    if (!current.active || !selectedDate) return;
    if (!current.day || !sameDay(current.day, selectedDate)) {
      current.day = selectedDate;
      current.list = list;
      current.origin ??= startOfDay(selectedDate);
    }
    if (loading) return;
    if (hasOpenTime) {
      current.active = false;
      return;
    }
    // Still the previous day's list (or none yet): wait for this day's answer.
    if (list === current.list) return;
    const origin = current.origin ?? startOfDay(selectedDate);
    const next = current.steps < MAX_STEPS ? latest.current.nextOpenDay(selectedDate) : null;
    current.steps += 1;
    if (!next) {
      current.active = false;
      setEnded(true);
      setNote(null);
      if (!sameDay(origin, selectedDate)) latest.current.show(origin);
      return;
    }
    setNote({ from: origin, to: next });
    latest.current.show(next);
  }, [selectedDate, list, hasOpenTime, loading]);

  const current = state.current;
  const waiting = current.active && Boolean(selectedDate) && !loading && !hasOpenTime && current.day !== null && list !== current.list;
  return { note, release, settling: waiting };
}
