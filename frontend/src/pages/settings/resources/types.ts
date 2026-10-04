export const API = 'appointment.scheduler.resources';

export interface ResourceType {
  name: string;
  type_name: string;
  is_active: number;
  services: string[];
}

export interface Resource {
  name: string;
  resource_name: string;
  resource_type: string;
  location: string;
  is_active: number;
  notes?: string | null;
  /** 1 = one booking at a time; more makes a counted pool. */
  capacity?: number;
}

export interface ResourceLocation {
  name: string;
  location_name: string;
  timezone: string;
}

export interface ResourceBlock {
  name: string;
  resource: string;
  starts_at: string;
  ends_at: string;
  local_start: string;
  local_end: string;
  reason?: string | null;
}

export interface BookingRef {
  booking: string;
  reference: string;
  client_name: string;
  appointment_date: string;
  start_time: string;
  service_name?: string;
  provider_name?: string;
  missing?: string[];
}

export interface ResourcesOverview {
  types: ResourceType[];
  resources: Resource[];
  locations: ResourceLocation[];
  blocks: ResourceBlock[];
  unassigned: BookingRef[];
  can_manage: boolean;
}

/** "2026-10-05T10:00" → "2026-10-05 10:00". */
export const wallTime = (value: string) => value.replace('T', ' ');
export const bookingTime = (row: BookingRef) => `${row.appointment_date} ${row.start_time.slice(0, 5).padStart(5, '0')}`;
