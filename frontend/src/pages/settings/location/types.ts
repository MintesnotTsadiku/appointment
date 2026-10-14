import { isMeetingLink } from '@/lib/online-session';
import { normalizePhone } from '@/lib/phone';

/** API of `appointment.scheduler.locations`. */
export const LOCATIONS_API = 'appointment.scheduler.locations';

export type LocationKind = 'In person' | 'Online';
export type LinkMode = 'Fixed link' | 'Per booking';

export interface Location {
  name: string;
  /** Owner key: the organization, or `Provider:<provider>` for an independent business. */
  owner: string;
  location_name: string;
  location_type: LocationKind;
  /** Street address of an in-person place; empty online. */
  address: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  phone?: string;
  timezone: string;
  video_platform: string;
  meeting_link_mode: LinkMode;
  /** The owner's own fixed link. Only these settings show it. */
  meeting_link: string;
  opening_hours_count: number;
  has_opening_hours: boolean;
  /** Services with an active offering here. */
  sessions: string[];
}

export interface Owner {
  key: string;
  kind: 'organization' | 'provider';
  label: string;
}

/** An independent owner's session, which a new place can offer. */
export interface SessionOption {
  owner: string;
  name: string;
  service_name: string;
}

export interface LocationOverview {
  owners: Owner[];
  locations: Location[];
  platforms: string[];
  sessions: SessionOption[];
}

export interface LocationFormData {
  owner: string;
  location_name: string;
  location_type: LocationKind;
  address_line_1: string;
  address_line_2: string;
  city: string;
  phone: string;
  timezone: string;
  video_platform: string;
  meeting_link_mode: LinkMode;
  meeting_link: string;
  sessions: string[];
}

export type LocationErrors = Partial<Record<keyof LocationFormData | 'submit', string>>;

export const TIMEZONES = [
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
];

export function emptyLocationForm(owner = '', kind: LocationKind = 'In person'): LocationFormData {
  return {
    owner,
    location_name: '',
    location_type: kind,
    address_line_1: '',
    address_line_2: '',
    city: 'Addis Ababa',
    phone: '',
    timezone: 'Africa/Addis_Ababa',
    video_platform: kind === 'Online' ? 'Google Meet' : '',
    meeting_link_mode: 'Fixed link',
    meeting_link: '',
    sessions: [],
  };
}

export function formFromLocation(location: Location): LocationFormData {
  return {
    ...emptyLocationForm(location.owner, location.location_type),
    location_name: location.location_name,
    address_line_1: location.address_line_1 || '',
    address_line_2: location.address_line_2 || '',
    city: location.city || 'Addis Ababa',
    phone: location.phone || '',
    timezone: location.timezone,
    video_platform: location.video_platform || '',
    meeting_link_mode: location.meeting_link_mode || 'Fixed link',
    meeting_link: location.meeting_link || '',
  };
}

/** Field errors as i18n keys. An online place needs no street address; a fixed link must be https. */
export function validateLocation(form: LocationFormData): LocationErrors {
  const errors: LocationErrors = {};
  if (!form.location_name || form.location_name.trim().length < 2) errors.location_name = 'staff.locations.errors.name';
  if (form.location_type === 'In person') {
    if (!form.address_line_1 || form.address_line_1.trim().length < 3) errors.address_line_1 = 'staff.locations.errors.address';
    if (!form.city || form.city.trim().length < 2) errors.city = 'staff.locations.errors.city';
  } else if (form.meeting_link_mode === 'Fixed link' && !isMeetingLink(form.meeting_link)) {
    errors.meeting_link = 'staff.locations.errors.link';
  }
  if (form.phone.trim() && !normalizePhone(form.phone)) errors.phone = 'controls.phone.hint';
  return errors;
}

/** The values the server takes; online fields are left out for an in-person place. */
export function payloadFor(form: LocationFormData, location?: string) {
  const online = form.location_type === 'Online';
  return {
    owner: form.owner,
    location,
    location_name: form.location_name.trim(),
    location_type: form.location_type,
    address_line_1: online ? '' : form.address_line_1.trim(),
    address_line_2: online ? '' : form.address_line_2.trim(),
    city: online ? '' : form.city.trim(),
    phone: normalizePhone(form.phone),
    timezone: form.timezone,
    video_platform: online ? form.video_platform.trim() : '',
    meeting_link_mode: form.meeting_link_mode,
    meeting_link: online && form.meeting_link_mode === 'Fixed link' ? form.meeting_link.trim() : '',
    ...(form.sessions.length ? { sessions: JSON.stringify(form.sessions) } : {}),
  };
}
