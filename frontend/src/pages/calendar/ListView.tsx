import { format, parseISO } from 'date-fns';
import { CalendarSearch } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { EmptyState } from '@/components/states';
import { byDateThenTime } from './dates';
import { AgendaRow } from './EventItem';
import type { Appointment } from './types';

/** Upcoming appointments grouped under a heading per day. */
export function ListView({ appointments, onOpen }: { appointments: Appointment[]; onOpen: (apt: Appointment) => void }) {
  const { t } = useTranslation();
  if (appointments.length === 0) {
    return <EmptyState icon={CalendarSearch} title={t('staff.calendar.emptyTitle')} description={t('staff.calendar.emptyHint')} className="m-4" />;
  }
  return (
    <div className="space-y-5 p-4">
      {groupByDate([...appointments].sort(byDateThenTime)).map(([date, items]) => (
        <section key={date} className="space-y-2" aria-label={dayHeading(date)}>
          <h3 className="text-sm font-semibold text-muted-foreground">{dayHeading(date)}</h3>
          {items.map((apt) => (
            <AgendaRow key={apt.name} appointment={apt} onOpen={onOpen} />
          ))}
        </section>
      ))}
    </div>
  );
}

function groupByDate(appointments: Appointment[]) {
  const groups = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const key = apt.appointment_date || '';
    groups.set(key, [...(groups.get(key) ?? []), apt]);
  }
  return [...groups.entries()];
}

function dayHeading(date: string) {
  return date ? format(parseISO(date), 'EEEE, MMMM d, yyyy') : '—';
}
