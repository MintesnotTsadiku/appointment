import { format } from 'date-fns';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DURATION_OPTIONS = ['15', '30', '45', '60', '90', '120'];
export const MINUTE_OPTIONS = [0, 15, 30, 45];

export type Period = 'AM' | 'PM';
export interface Time12 {
  hour: number;
  minute: number;
  period: Period;
}

/** Strips characters Frappe rejects from the local part of an email address. */
export function normalizeEmail(email: string): string {
  if (!email || !email.trim()) return '';
  const trimmed = email.trim();
  const [localPart, domain] = trimmed.split('@');
  if (!domain) return trimmed;
  const cleanedLocal = localPart.replace(/[^a-zA-Z0-9._-]/g, '');
  const normalizedLocal = cleanedLocal.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
  return `${normalizedLocal}@${domain}`;
}

/** "HH:mm" (24h) → 12-hour parts. */
export function toTime12(time: string): Time12 {
  const [hours, minutes] = time.split(':').map(Number);
  return {
    hour: hours === 0 ? 12 : hours > 12 ? hours - 12 : hours,
    minute: minutes || 0,
    period: hours >= 12 ? 'PM' : 'AM',
  };
}

/** 12-hour parts → "HH:mm" (24h). */
export function toTime24({ hour, minute, period }: Time12): string {
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) hour24 = hour + 12;
  else if (period === 'AM' && hour === 12) hour24 = 0;
  return `${pad(hour24)}:${pad(minute)}`;
}

/** Trigger label, e.g. "03:00 PM" (QA reads this exact shape). */
export function formatTime12({ hour, minute, period }: Time12): string {
  return `${pad(hour)}:${pad(minute)} ${period}`;
}

/** Start as a Date plus the "HH:mm:ss" end time for a booking of `duration` minutes. */
export function scheduleWindow(date: string, startTime: string, duration: string) {
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(start.getTime() + parseInt(duration) * 60000);
  return { start, endTime: format(end, 'HH:mm:ss') };
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export interface BookingDraft {
  client_name: string;
  client_phone: string;
  client_email: string;
  service_name: string;
  provider_name: string;
  location_name: string;
  appointment_date: string;
  start_time: string;
  duration: string;
  notes: string;
  /** Customer Profile picked at the desk; empty lets the server match or create one. */
  customer?: string;
  /** The room or machine, for a service booked without staff. */
  resource_name?: string;
}

export type FieldErrors = Partial<Record<keyof BookingDraft, string>>;

/** Name and assignment are required; phone and email are optional (email is checked when present). */
export function validateBooking(
  draft: BookingDraft,
  messages: { required: string; email: string },
  { resourceOnly = false, resourceFixed = false }: { resourceOnly?: boolean; resourceFixed?: boolean } = {},
): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.client_name.trim()) errors.client_name = messages.required;
  if (draft.client_email.trim() && !EMAIL_PATTERN.test(draft.client_email.trim())) errors.client_email = messages.email;
  if (!draft.service_name) errors.service_name = messages.required;
  if (resourceOnly) {
    // A room or machine replaces the provider; an existing booking keeps its own.
    if (!resourceFixed && !draft.resource_name) errors.resource_name = messages.required;
    return errors;
  }
  if (!draft.provider_name) errors.provider_name = messages.required;
  if (!draft.location_name) errors.location_name = messages.required;
  return errors;
}
