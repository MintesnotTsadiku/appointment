import { format } from 'date-fns';
import { useFrappeGetCall } from 'frappe-react-sdk';
import type { Appointment } from '@/pages/reception/types';

export interface DeskDay {
  appointments: Appointment[];
  count: number;
  timezone: string;
  next_date: string | null;
}

/** Today's desk agenda from the same read endpoint the reception desk uses. */
export function useDeskDay(organization: string | undefined, date: Date = new Date()) {
  const day = format(date, 'yyyy-MM-dd');
  const result = useFrappeGetCall<{ message: DeskDay }>(
    'appointment.scheduler.api.desk.get_desk_appointments',
    { date: day, view: 'day', organization: organization || undefined },
    organization ? `home-today-${organization}-${day}` : null,
    { revalidateOnFocus: true }
  );
  return { ...result, day };
}
