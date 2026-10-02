import { isSameDay, parseISO } from 'date-fns';
import type { Appointment, TimeSlotInterval } from '../types';

export const START_HOUR = 8;
export const END_HOUR = 20;
/** Height of the sticky day header above the slot grid. */
export const HEADER_PX = 64;
const BASE_SLOT_PX = 72;
const MIN_CARD_PX = 60;
const MAX_VISIBLE_PER_COLUMN = 3;

export interface Slot {
  hour: number;
  minute: number;
}

export interface CardLayout {
  top: number;
  height: number;
  left: number;
  width: number;
  column: number;
  totalColumns: number;
  isOverflow?: boolean;
  overflowCount?: number;
  overflowAppointments?: Appointment[];
  overflowDate?: Date;
}

/** Slots from 08:00 to 20:00 at the chosen interval. */
export function buildTimeSlots(interval: TimeSlotInterval): Slot[] {
  const slots: Slot[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let i = 0; i < 60 / interval; i++) slots.push({ hour, minute: i * interval });
  }
  return slots;
}

/** A 30-minute slot is 72px; other intervals scale so an hour keeps the same height. */
export function slotHeightFor(interval: TimeSlotInterval) {
  return (BASE_SLOT_PX * 30) / interval;
}

export function appointmentsOn(appointments: Appointment[], date: Date) {
  return appointments.filter((apt) => apt.appointment_date && isSameDay(parseISO(apt.appointment_date), date));
}

export function pad(value: number) {
  return value.toString().padStart(2, '0');
}

/** Top offset (px, below the header) of the current-time line. */
export function nowOffset(interval: TimeSlotInterval, slotPx: number) {
  const now = new Date();
  return HEADER_PX + ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / interval) * slotPx;
}

export function fallbackPosition(appointment: Appointment, interval: TimeSlotInterval, slotPx: number) {
  if (!appointment.start_time) return null;
  const [hours, minutes] = appointment.start_time.split(':').map(Number);
  const [endHours, endMinutes] = appointment.end_time?.split(':').map(Number) || [hours + 1, minutes];
  return verticalSpan(hours * 60 + minutes, endHours * 60 + endMinutes, interval, slotPx);
}

/**
 * Place overlapping appointments side by side. Each overlap group is packed
 * into columns; a column shows three cards before the rest become overflow.
 */
export function layoutAppointments(appointments: Appointment[], interval: TimeSlotInterval, slotPx: number) {
  const layouts = new Map<string, CardLayout>();
  if (!appointments.length) return layouts;
  for (const group of overlapGroups(sortByStart(appointments))) {
    const columns = packColumns(sortByStart(group));
    columns.forEach((column, colIndex) => placeColumn(layouts, column, colIndex, columns.length, interval, slotPx));
  }
  return layouts;
}

function placeColumn(layouts: Map<string, CardLayout>, column: Appointment[], colIndex: number, totalColumns: number, interval: TimeSlotInterval, slotPx: number) {
  const overflowCount = Math.max(0, column.length - MAX_VISIBLE_PER_COLUMN);
  const overflowAppointments = overflowCount > 0 ? column.slice(MAX_VISIBLE_PER_COLUMN) : [];
  const gapPercent = 0.5;
  const paddingPercent = 1;
  const columnWidth = (100 - paddingPercent * 2 - gapPercent * (totalColumns - 1)) / totalColumns;
  const left = paddingPercent + colIndex * (columnWidth + gapPercent);
  column.forEach((apt, aptIndex) => {
    if (!apt.start_time || !apt.end_time) return;
    const [hours, minutes] = apt.start_time.split(':').map(Number);
    const [endHours, endMinutes] = apt.end_time.split(':').map(Number);
    const isOverflow = aptIndex >= MAX_VISIBLE_PER_COLUMN;
    const lastVisible = aptIndex === MAX_VISIBLE_PER_COLUMN - 1;
    layouts.set(apt.name, {
      ...verticalSpan(hours * 60 + minutes, endHours * 60 + endMinutes, interval, slotPx),
      left,
      width: columnWidth,
      column: colIndex,
      totalColumns,
      isOverflow,
      overflowCount: isOverflow ? 0 : lastVisible ? overflowCount : 0,
      overflowAppointments: isOverflow ? [] : lastVisible ? overflowAppointments : [],
      overflowDate: apt.appointment_date ? parseISO(apt.appointment_date) : new Date(),
    });
  });
}

function verticalSpan(startMinutes: number, endMinutes: number, interval: TimeSlotInterval, slotPx: number) {
  const top = ((startMinutes - START_HOUR * 60) / interval) * slotPx;
  const height = Math.max(((endMinutes - startMinutes) / interval) * slotPx, MIN_CARD_PX);
  return { top, height };
}

function overlapGroups(sorted: Appointment[]) {
  const groups: Appointment[][] = [];
  for (const apt of sorted) {
    if (!apt.start_time || !apt.end_time) continue;
    const group = groups.find((existing) => existing.some((other) => overlaps(apt, other)));
    if (group) group.push(apt);
    else groups.push([apt]);
  }
  return groups;
}

function packColumns(group: Appointment[]) {
  const columns: Appointment[][] = [];
  for (const apt of group) {
    if (!apt.start_time || !apt.end_time) continue;
    const column = columns.find((existing) => existing.every((other) => !overlaps(apt, other)));
    if (column) column.push(apt);
    else columns.push([apt]);
  }
  return columns;
}

function overlaps(a: Appointment, b: Appointment) {
  if (!b.start_time || !b.end_time) return false;
  const [aStart, aEnd] = span(a);
  const [bStart, bEnd] = span(b);
  return aStart < bEnd && aEnd > bStart;
}

function span(apt: Appointment) {
  return [parseISO(`${apt.appointment_date}T${apt.start_time}`), parseISO(`${apt.appointment_date}T${apt.end_time}`)] as const;
}

function sortByStart(appointments: Appointment[]) {
  return [...appointments].sort((a, b) => {
    if (!a.start_time || !b.start_time) return 0;
    return span(a)[0].getTime() - span(b)[0].getTime();
  });
}
