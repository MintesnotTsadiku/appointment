import type { ProviderProfile } from './useProfileData';

export interface ProfileFormData {
  provider_name: string;
  full_name: string;
  phone: string;
  bio: string;
  /** The Amharic bio; the Amharic provider page shows it, else the English one. */
  bio_am: string;
  timezone: string;
  language: string;
  business_type: string;
  /** Spoken language codes joined by commas, in `SPOKEN_LANGUAGES` order. */
  spoken_languages: string;
}

export const BUSINESS_TYPES = [
  { value: 'clinic', label: 'Clinic/Hospital' },
  { value: 'salon', label: 'Salon/Spa' },
  { value: 'university', label: 'University/School' },
  { value: 'legal', label: 'Legal/Consulting' },
  { value: 'other', label: 'Other' },
];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ (Amharic)' },
];

/** Languages a provider can list on the public provider page, each in its own script. */
export const SPOKEN_LANGUAGES = [
  { value: 'am', label: 'አማርኛ' },
  { value: 'en', label: 'English' },
  { value: 'om', label: 'Afaan Oromoo' },
  { value: 'ti', label: 'ትግርኛ' },
  { value: 'so', label: 'Soomaali' },
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
];

export const TIMEZONES = [
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
];

export function formFromProvider(data?: ProviderProfile): ProfileFormData {
  return {
    provider_name: data?.provider_name || '',
    full_name: data?.full_name || '',
    phone: data?.phone || '',
    bio: data?.bio || '',
    bio_am: data?.bio_am || '',
    timezone: data?.timezone || 'Africa/Addis_Ababa',
    language: data?.language || 'en',
    business_type: data?.business_type || 'clinic',
    spoken_languages: SPOKEN_LANGUAGES.map((row) => row.value).filter((code) => data?.spoken_languages?.includes(code)).join(','),
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
