export const LEAD_HOURS = { min: 1, max: 72 };

export function leadTimeValid(hours: number) {
  return Number.isInteger(hours) && hours >= LEAD_HOURS.min && hours <= LEAD_HOURS.max;
}
