export type ViewMode = 'month' | 'week' | 'day' | 'list';

export type AppointmentStatus = 'Confirmed' | 'Completed' | 'Cancelled' | 'Pending' | 'No Show';

export interface Appointment {
  name: string;
  appointment_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service: string;
  service_name: string;
  provider: string;
  provider_name: string;
  location: string;
  location_name: string;
  status: AppointmentStatus;
  amount_paid?: number;
  currency?: string;
  notes?: string;
  event_type?: string;
  event?: string;
}

export interface CalendarStats {
  this_week: number;
  upcoming: number;
  completed_this_month: number;
}

export const STATUS_OPTIONS: AppointmentStatus[] = ['Confirmed', 'Completed', 'Pending', 'Cancelled', 'No Show'];

/** Shared by the desktop and phone month layouts. */
export interface MonthViewProps {
  date: Date;
  selectedDay: Date;
  forDay: (day: Date) => Appointment[];
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpen: (apt: Appointment) => void;
}
