export interface Appointment {
  name: string;
  appointment_id: string;
  organization?: string;
  booking_timezone?: string;
  modified?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  /** Customer Profile ID, when the booking is linked. */
  customer?: string | null;
  /** Set when the customer changed the booking through their manage link. */
  last_changed_by?: 'Staff' | 'Customer' | '' | null;
  cancellation_fee?: number;
  refund_due?: number;
  service: string;
  service_name: string;
  provider: string;
  provider_name: string;
  location: string;
  location_name: string;
  /** Rooms or equipment the booking holds. */
  resource_names?: string[];
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  amount_paid?: number;
  currency?: string;
  notes?: string;
  event_type?: string;
  event?: string;
}

export interface WalkIn {
  name: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  service_requested?: string;
  location?: string;
  location_name?: string;
  provider_preferred?: string;
  provider_preferred_name?: string;
  status: 'waiting' | 'assigned' | 'cancelled';
  assigned_appointment?: string;
  notes?: string;
  creation: string;
}

export interface Service {
  name: string;
  service_name: string;
  duration: number;
  price?: number;
}

export interface Provider {
  name: string;
  provider_name: string;
}

export interface Location {
  name: string;
  location_name: string;
}

export type ViewMode = 'day' | 'week';
export type TimeSlotInterval = 15 | 30 | 45 | 60;


