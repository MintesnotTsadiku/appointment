import { timeRange } from './dates';
import type { Appointment } from './types';

/** Dot tones match StatusBadge variants so the grid and badges agree. */
const DOT: Record<string, string> = {
  Pending: 'bg-info',
  Confirmed: 'bg-success',
  Completed: 'bg-muted-foreground',
  Cancelled: 'bg-destructive',
  'No Show': 'bg-warning',
};

/** Surface and accent for events placed on the time grid. */
const BLOCK: Record<string, string> = {
  Pending: 'border-l-info bg-info/10',
  Confirmed: 'border-l-success bg-success/10',
  Completed: 'border-l-muted-foreground bg-muted',
  Cancelled: 'border-l-destructive bg-destructive/10',
  'No Show': 'border-l-warning bg-warning/10',
};

export function dotTone(status: string) {
  return DOT[status] ?? 'bg-muted-foreground';
}

export function blockTone(status: string) {
  return BLOCK[status] ?? 'border-l-muted-foreground bg-muted';
}

export function eventLabel(apt: Appointment) {
  return `${timeRange(apt)}, ${apt.client_name}, ${apt.service_name}, ${apt.status}`;
}
