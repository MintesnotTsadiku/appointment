import { minutesOf } from './dates';
import type { Appointment } from './types';

export const HOUR_PX = 56;
const MIN_EVENT_PX = 28;
const DEFAULT_MINUTES = 60;

export interface PlacedEvent {
  appointment: Appointment;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

/** Visible hour window: at least 08–18, widened to fit every event. */
export function hourWindow(appointments: Appointment[]) {
  let first = 8;
  let last = 18;
  for (const apt of appointments) {
    if (!apt.start_time) continue;
    const { start, end } = span(apt);
    first = Math.min(first, Math.floor(start / 60));
    last = Math.max(last, Math.ceil(end / 60));
  }
  return { first: Math.max(0, first), last: Math.min(24, last) };
}

/** Positions one day's events, splitting overlapping ones into side-by-side lanes. */
export function placeEvents(appointments: Appointment[], firstHour: number): PlacedEvent[] {
  const timed = appointments.filter((apt) => apt.start_time).map((apt) => ({ apt, ...span(apt) })).sort((a, b) => a.start - b.start);
  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    cluster.forEach((event) => (event.lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };

  for (const { apt, start, end } of timed) {
    if (start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.push(end) - 1;
    else laneEnds[lane] = end;
    clusterEnd = Math.max(clusterEnd, end);
    const event = { appointment: apt, top: ((start - firstHour * 60) / 60) * HOUR_PX, height: Math.max(((end - start) / 60) * HOUR_PX, MIN_EVENT_PX), lane, lanes: 1 };
    cluster.push(event);
    placed.push(event);
  }
  closeCluster();
  return placed;
}

function span(apt: Appointment) {
  const start = minutesOf(apt.start_time);
  const end = apt.end_time ? minutesOf(apt.end_time) : start + DEFAULT_MINUTES;
  return { start, end: end > start ? end : start + DEFAULT_MINUTES };
}
