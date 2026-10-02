import { useCallback, useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { byDateThenTime, isOnDay, rangeFor } from './dates';
import type { Appointment, CalendarStats, ViewMode } from './types';

const EMPTY_STATS: CalendarStats = { this_week: 0, upcoming: 0, completed_this_month: 0 };

interface Filters {
  view: ViewMode;
  date: Date;
  status: string;
  search: string;
}

/** Appointments for the visible window plus the summary stats. */
export function useCalendarData({ view, date, status, search }: Filters) {
  const range = useMemo(() => rangeFor(view, date), [view, date]);

  const appointmentsCall = useFrappeGetCall<{ message: { appointments: Appointment[] } }>(
    'appointment.dashboard.get_appointments',
    {
      start_date: range.start,
      end_date: range.end,
      status: status !== 'All' ? status : undefined,
      // The service filter was never exposed in the UI, so it is always unset.
      service: undefined,
      search: search || undefined,
    },
    `appointments-${range.start}-${range.end}-${status}-All-${search}`,
    // Keep the last result on screen while a new range or search loads.
    { revalidateOnFocus: true, keepPreviousData: true }
  );

  const statsCall = useFrappeGetCall<{ message: CalendarStats }>('appointment.dashboard.get_calendar_stats', undefined, 'calendar-stats', {
    revalidateOnFocus: true,
  });

  const loaded = appointmentsCall.data?.message?.appointments;
  const appointments = useMemo(() => filterBySearch(loaded ?? [], search), [loaded, search]);
  const forDay = useCallback((day: Date) => appointments.filter((apt) => isOnDay(apt, day)).sort(byDateThenTime), [appointments]);
  const { mutate } = appointmentsCall;
  const retry = useCallback(() => void mutate(), [mutate]);

  return {
    loaded: loaded ?? [],
    appointments,
    forDay,
    loading: appointmentsCall.isLoading && !appointmentsCall.data,
    error: appointmentsCall.error && !appointmentsCall.data ? appointmentsCall.error : null,
    retry,
    stats: statsCall.data?.message ?? EMPTY_STATS,
    statsLoading: statsCall.isLoading,
  };
}

/** The API also searches; this keeps the visible list in step while typing. */
function filterBySearch(appointments: Appointment[], search: string) {
  if (!search) return appointments;
  const query = search.toLowerCase();
  return appointments.filter(
    (apt) =>
      apt.client_name?.toLowerCase().includes(query) ||
      apt.service_name?.toLowerCase().includes(query) ||
      apt.appointment_id?.toLowerCase().includes(query)
  );
}
