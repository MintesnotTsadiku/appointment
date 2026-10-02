import { formatWallTime, type ClockFormat } from '@/lib/time';

export type AvailabilityLevel = 'location' | 'service' | 'provider';

export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface DaySchedule {
  day: string;
  ranges: TimeRange[];
  isOpen: boolean;
}

export interface AvailabilityData {
  schedule: DaySchedule[];
  use_default_hours: boolean;
  provider?: { name: string; provider_name: string; email: string } | null;
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getDefaultSchedule(): DaySchedule[] {
  return DAYS_OF_WEEK.map((day) => ({ day, isOpen: false, ranges: [] }));
}

/** Payload rows for `save_availability`: one row per range, or a closed marker per day. */
export function convertScheduleToOpeningHours(schedule: DaySchedule[]) {
  return schedule.flatMap((daySchedule) => {
    if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
      return daySchedule.ranges.map((range) => ({
        day_of_week: daySchedule.day,
        start_time: normalizeTime(range.start),
        end_time: normalizeTime(range.end),
        is_open: 1,
      }));
    }
    return [{ day_of_week: daySchedule.day, start_time: '00:00:00', end_time: '00:00:00', is_open: 0 }];
  });
}

/** True when the range sits entirely inside one of the parent's ranges (or there is no parent). */
export function isRangeWithinParent(range: TimeRange, parentRanges: TimeRange[]): boolean {
  if (parentRanges.length === 0) return true;
  const start = timeToMinutes(range.start);
  const end = timeToMinutes(range.end);
  return parentRanges.some((parent) => start >= timeToMinutes(parent.start) && end <= timeToMinutes(parent.end));
}

export function formatTime(time24: string, format: ClockFormat): string {
  return time24 ? formatWallTime(time24, format) : '';
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// The editor/API may produce `8:30`, `8:30:` or `8:30:00`; the server needs strict `HH:MM:SS`.
function normalizeTime(value: string) {
  const parts = String(value || '').split(':');
  const hours = (parts[0] || '00').padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  const seconds = (parts[2] || '00').padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/** Server times may carry seconds or an unpadded hour ("9:00:00"); the editor works in HH:MM. */
export function toEditorSchedule(schedule: DaySchedule[]): DaySchedule[] {
  return schedule.map((day) => ({
    ...day,
    ranges: day.ranges.map((range) => ({ start: toHourMinute(range.start), end: toHourMinute(range.end) })),
  }));
}

function toHourMinute(value: string) {
  const [hours = '00', minutes = '00'] = String(value || '').split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}
