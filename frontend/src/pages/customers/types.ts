/** Shapes returned by appointment.scheduler.customers. */
export const CUSTOMERS_API = 'appointment.scheduler.customers';

export type CustomerRole = 'manager' | 'reception' | 'provider';

export interface CustomerSummary {
  name: string;
  display_name: string;
  status: 'Active' | 'Archived';
  booking_count: number;
  last_booking: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  possible_duplicate?: number;
}

export interface PreferredProvider {
  provider: string;
  provider_name?: string | null;
  service?: string | null;
  service_name?: string | null;
  priority: number;
}

export interface CustomerHistoryRow {
  name: string;
  appointment_date: string;
  start_time: string;
  status: string;
  service_name: string | null;
  provider_name: string | null;
  location_name: string | null;
}

export interface CustomerDetail extends CustomerSummary {
  role: CustomerRole;
  preferred_language?: string | null;
  private_notes?: string | null;
  merged_into?: string | null;
  preferred_providers?: PreferredProvider[];
  history: CustomerHistoryRow[];
}

export interface SearchResult {
  customers: CustomerSummary[];
  has_more: boolean;
  role: CustomerRole;
}
