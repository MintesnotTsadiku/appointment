export interface Service {
  name: string;
  service_name: string;
  description: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  event_types: Array<{
    name: string;
    event_type_name: string;
    location: string;
  }>;
}

export interface ServiceProvider {
  name: string;
  provider_name: string;
  email: string;
  phone?: string;
  is_primary: boolean;
  status: string;
  price_override?: number;
  duration_override?: number;
  commission_rate?: number;
  notes?: string;
}

export interface ServiceDetails {
  name: string;
  service_name: string;
  description: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  organization: string;
  currency: string;
}

/** Minutes as "45 min", "1h", "1h 30m"; empty/invalid values read as "not set". */
export function formatDuration(minutes: number | undefined, notSet: string): string {
  if (!minutes || isNaN(minutes) || minutes <= 0) return notSet;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string } | null)?.message;
  return message || fallback;
}
