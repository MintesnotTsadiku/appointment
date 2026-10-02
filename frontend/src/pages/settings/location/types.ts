export interface Location {
  name: string;
  location_name: string;
  address: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  phone?: string;
  timezone: string;
  opening_hours_count: number;
  has_opening_hours: boolean;
}

export interface ProviderOption {
  name: string;
  provider_name: string;
  full_name?: string;
}

export interface ServiceOption {
  name: string;
  service_name: string;
  description?: string;
}

export interface LocationFormData {
  location_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  phone: string;
  timezone: string;
  provider_id: string;
  service_ids: string[];
}

export type LocationErrors = Partial<Record<keyof LocationFormData | 'submit', string>>;

export const TIMEZONES = [
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
];

export function emptyLocationForm(providerId = ''): LocationFormData {
  return {
    location_name: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Addis Ababa',
    phone: '',
    timezone: 'Africa/Addis_Ababa',
    provider_id: providerId,
    service_ids: [],
  };
}

export function formFromLocation(location: Location): LocationFormData {
  return {
    ...emptyLocationForm(),
    location_name: location.location_name,
    address_line_1: location.address_line_1 || '',
    address_line_2: location.address_line_2 || '',
    city: location.city || 'Addis Ababa',
    phone: location.phone || '',
    timezone: location.timezone,
  };
}

/** Keeps the original English validation messages; keys map to i18n entries. */
export function validateLocation(form: LocationFormData): LocationErrors {
  const errors: LocationErrors = {};
  if (!form.location_name || form.location_name.trim().length < 2) errors.location_name = 'staff.locations.errors.name';
  if (!form.address_line_1 || form.address_line_1.trim().length < 3) errors.address_line_1 = 'staff.locations.errors.address';
  if (!form.city || form.city.trim().length < 2) errors.city = 'staff.locations.errors.city';
  return errors;
}
