/**
 * The groups of the slot list. With Habesha time the groups are the Habesha periods of the slot labels
 * (night, morning, afternoon, evening: `habeshaPeriod` in `lib/time.ts`), so "11:00 afternoon" is under
 * "Afternoon". 12-hour and 24-hour keep the international parts of the day (morning, afternoon, evening).
 */
import { HABESHA_PERIODS, habeshaPeriodOfInstant, type HabeshaPeriod } from "@/lib/time";
import { getTimeOfDay } from "../../../utils/dateHelpers";
import type { TimeFormat } from "../../../types";

export type SlotGroupKey = HabeshaPeriod;

const DAY_PARTS = ["morning", "afternoon", "evening"] as const;

/** The group of a slot's start, in the clock the picker shows. */
export function slotGroupKey(start: string, timeFormat: TimeFormat, timezone?: string): SlotGroupKey {
  if (timeFormat === "ethiopian") return habeshaPeriodOfInstant(start, timezone);
  return getTimeOfDay(new Date(start));
}

/** The slots by group, in the order of the day, without empty groups. */
export function groupSlots<T extends { start_time: string }>(slots: T[], timeFormat: TimeFormat, timezone?: string): { key: SlotGroupKey; slots: T[] }[] {
  const keys: readonly SlotGroupKey[] = timeFormat === "ethiopian" ? HABESHA_PERIODS : DAY_PARTS;
  return keys
    .map((key) => ({ key, slots: slots.filter((slot) => slotGroupKey(slot.start_time, timeFormat, timezone) === key) }))
    .filter((group) => group.slots.length > 0);
}
