import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, parseISO,
  startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from 'date-fns';
import type { Appointment, ViewMode } from './types';

const WEEK = { weekStartsOn: 1 } as const;
const ISO = 'yyyy-MM-dd';

/** Date window requested from the API for a view; list shows the next 30 days. */
export function rangeFor(view: ViewMode, date: Date) {
  switch (view) {
    case 'week':
      return { start: format(startOfWeek(date, WEEK), ISO), end: format(endOfWeek(date, WEEK), ISO) };
    case 'day':
      return { start: format(date, ISO), end: format(date, ISO) };
    case 'list':
      return { start: format(date, ISO), end: format(addDays(date, 30), ISO) };
    default:
      return { start: format(startOfMonth(date), ISO), end: format(endOfMonth(date), ISO) };
  }
}

/** Moves the anchor date one period; day and list both step by a day. */
export function stepDate(view: ViewMode, date: Date, direction: 1 | -1) {
  if (view === 'month') return direction > 0 ? addMonths(date, 1) : subMonths(date, 1);
  if (view === 'week') return direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1);
  return direction > 0 ? addDays(date, 1) : subDays(date, 1);
}

export function rangeLabel(view: ViewMode, date: Date, listPrefix: string) {
  if (view === 'month') return format(date, 'MMMM yyyy');
  if (view === 'day') return format(date, 'EEEE, MMMM d, yyyy');
  if (view === 'list') return `${listPrefix} ${format(date, 'MMM d')}`;
  return `${format(startOfWeek(date, WEEK), 'MMM d')} – ${format(endOfWeek(date, WEEK), 'MMM d, yyyy')}`;
}

export function monthGridDays(date: Date) {
  const days: Date[] = [];
  const end = endOfWeek(endOfMonth(date), WEEK);
  for (let day = startOfWeek(startOfMonth(date), WEEK); day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function weekDays(date: Date) {
  const start = startOfWeek(date, WEEK);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isOnDay(appointment: Appointment, day: Date) {
  return Boolean(appointment.appointment_date) && isSameDay(parseISO(appointment.appointment_date), day);
}

/** "09:30:00" → "09:30". */
export function shortTime(time?: string) {
  return time ? time.slice(0, 5) : '';
}

export function timeRange(appointment: Appointment) {
  const end = shortTime(appointment.end_time);
  return end ? `${shortTime(appointment.start_time)} – ${end}` : shortTime(appointment.start_time);
}

export function minutesOf(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function byDateThenTime(a: Appointment, b: Appointment) {
  const byDate = (a.appointment_date || '').localeCompare(b.appointment_date || '');
  return byDate || (a.start_time || '').localeCompare(b.start_time || '');
}
