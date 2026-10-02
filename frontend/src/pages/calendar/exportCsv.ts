import { format } from 'date-fns';
import type { Appointment } from './types';

const HEADERS = ['Appointment ID', 'Date', 'Time', 'Client', 'Service', 'Status', 'Amount'];

/** Downloads the loaded appointments as CSV (same columns as before the redesign). */
export function exportAppointmentsCsv(appointments: Appointment[]) {
  const rows = appointments.map((apt) => [
    apt.appointment_id || apt.name,
    apt.appointment_date || '',
    `${apt.start_time || ''} - ${apt.end_time || ''}`,
    apt.client_name || '',
    apt.service_name || '',
    apt.status || '',
    `${apt.amount_paid || 0} ${apt.currency || 'ETB'}`,
  ]);
  const csv = [HEADERS, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
