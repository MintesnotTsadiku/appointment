import { minutesToTime, timeToMinutes, type DaySchedule } from './schedule';

export type StartTime = '08:00' | '08:30' | '09:00';
export type Duration = 8 | 12 | 24;

export interface QuickTemplate {
  startTime: StartTime;
  duration: Duration;
  includeLunch: boolean;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const START_TIMES: StartTime[] = ['08:00', '08:30', '09:00'];
export const DURATIONS: Duration[] = [8, 12, 24];
export const OFFSET_PRESETS = [15, 30, 60, 120];
export const MAX_OFFSET = 240;
const LUNCH_START = '12:00';
const LUNCH_END = '13:00';

export const QUICK_TEMPLATES: QuickTemplate[] = [
  { startTime: '08:00', duration: 8, includeLunch: false },
  { startTime: '08:00', duration: 8, includeLunch: true },
  { startTime: '09:00', duration: 8, includeLunch: false },
  { startTime: '09:00', duration: 8, includeLunch: true },
];

/** Replaces the given days in `schedule` with the template, appending days that are missing. */
export function applyTemplate(schedule: DaySchedule[], days: string[], template: QuickTemplate): DaySchedule[] {
  const next = [...schedule];
  createScheduleFromTemplate(days, template).forEach((templateDay) => {
    const index = next.findIndex((d) => d.day === templateDay.day);
    if (index !== -1) next[index] = templateDay;
    else next.push(templateDay);
  });
  return next;
}

/** Splits a single range spanning noon into two around a 12:00–13:00 lunch; returns null if not possible. */
export function addLunchBreak(schedule: DaySchedule[], day: string): DaySchedule[] | null {
  const index = schedule.findIndex((d) => d.day === day);
  const target = schedule[index];
  if (!target || !canAddLunch(target)) return null;
  const range = target.ranges[0];
  const next = [...schedule];
  next[index] = { ...target, ranges: [{ start: range.start, end: LUNCH_START }, { start: LUNCH_END, end: range.end }] };
  return next;
}

export function canAddLunch(day: DaySchedule): boolean {
  return day.isOpen && day.ranges.length === 1 && day.ranges[0].start <= LUNCH_START && day.ranges[0].end >= LUNCH_END;
}

export function calculateEndTime(startTime: StartTime, duration: number): string {
  if (duration === 24) return '23:59'; // "24 hours" means until end of day
  return minutesToTime(timeToMinutes(startTime) + duration * 60);
}

/**
 * Service offset: shifts each parent range inward by minutes, clamped to the parent's day bounds.
 * Ranges that collapse are dropped.
 */
export function offsetServiceSchedule(parent: DaySchedule[], startOffset: number, endOffset: number): DaySchedule[] {
  return parent.map((day) => {
    if (!day.isOpen || day.ranges.length === 0) return { ...day };
    const dayStart = timeToMinutes(day.ranges[0].start);
    const dayEnd = timeToMinutes(day.ranges[day.ranges.length - 1].end);
    const ranges = day.ranges
      .map((range) => {
        const rangeEnd = timeToMinutes(range.end);
        const start = Math.min(Math.max(timeToMinutes(range.start) + startOffset, dayStart), rangeEnd - 1);
        const end = Math.max(Math.min(rangeEnd - endOffset, dayEnd), start + 1);
        return start >= end ? null : { start: minutesToTime(start), end: minutesToTime(end) };
      })
      .filter((range): range is { start: string; end: string } => range !== null && range.start < range.end);
    return { day: day.day, isOpen: ranges.length > 0, ranges };
  });
}

/** Provider offset: same intent as the service variant, using clamped string arithmetic. */
export function offsetProviderSchedule(parent: DaySchedule[], startOffset: number, endOffset: number): DaySchedule[] {
  return parent.map((day) => {
    if (!day.isOpen || day.ranges.length === 0) return { ...day };
    const dayStart = day.ranges[0].start;
    const dayEnd = day.ranges[day.ranges.length - 1].end;
    const ranges = day.ranges
      .map((range) => {
        const start = addMinutesToTime(range.start, startOffset, dayStart, range.end);
        return { start, end: addMinutesToTime(range.end, -endOffset, start, dayEnd) };
      })
      .filter((range) => range.start < range.end);
    return { day: day.day, isOpen: ranges.length > 0, ranges };
  });
}

/** First/last bounds of the first few open parent days, before and after the offset. */
export function previewOffset(parent: DaySchedule[], startOffset: number, endOffset: number) {
  return parent
    .filter((d) => d.isOpen && d.ranges.length > 0)
    .slice(0, 3)
    .map((day) => {
      const from = day.ranges[0].start;
      const to = day.ranges[day.ranges.length - 1].end;
      const start = addMinutesToTime(from, startOffset, from, to);
      return { day: day.day, from, to, start, end: addMinutesToTime(to, -endOffset, start, to) };
    });
}

function createScheduleFromTemplate(days: string[], { startTime, duration, includeLunch }: QuickTemplate): DaySchedule[] {
  const endTime = calculateEndTime(startTime, duration);
  const ranges = includeLunch && duration >= 8
    ? [{ start: startTime, end: LUNCH_START }, { start: LUNCH_END, end: endTime }]
    : [{ start: startTime, end: endTime }];
  return days.map((day) => ({ day, isOpen: true, ranges: ranges.map((r) => ({ ...r })) }));
}

/** Adds minutes within 00:00–23:59, then clamps to [minTime, maxTime] as strings. */
function addMinutesToTime(time: string, minutes: number, minTime?: string, maxTime?: string): string {
  const total = Math.max(0, Math.min(23 * 60 + 59, timeToMinutes(time) + minutes));
  const next = minutesToTime(total);
  if (minTime && next < minTime) return minTime;
  if (maxTime && next > maxTime) return maxTime;
  return next;
}
