import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { CalendarX2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/states';
import { monthGridDays } from './dates';
import { AgendaRow, StatusDot } from './EventItem';
import { WeekdayHeader } from './WeekdayHeader';
import type { Appointment, MonthViewProps } from './types';

const MAX_DOTS = 3;

/** Phone month: each day is a button with status dots; the chosen day's agenda sits below. */
export function MonthMobile({ date, selectedDay, forDay, onSelectDay, onOpen }: MonthViewProps) {
  const { t } = useTranslation();
  const agenda = forDay(selectedDay);
  return (
    <div>
      <WeekdayHeader date={date} short />
      <div className="grid grid-cols-7 gap-y-1 p-1">
        {monthGridDays(date).map((day) => (
          <MobileDay key={day.toISOString()} day={day} inMonth={isSameMonth(day, date)} selected={isSameDay(day, selectedDay)} appointments={forDay(day)} onSelect={onSelectDay} />
        ))}
      </div>
      <section aria-live="polite" className="space-y-2 border-t p-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t('staff.calendar.agendaFor')} {format(selectedDay, 'EEEE, MMMM d')}
        </h3>
        {agenda.length === 0 ? (
          <EmptyState compact icon={CalendarX2} title={t('staff.calendar.noAppointmentsDay')} />
        ) : (
          agenda.map((apt) => <AgendaRow key={apt.name} appointment={apt} onOpen={onOpen} />)
        )}
      </section>
    </div>
  );
}

interface MobileDayProps {
  day: Date;
  inMonth: boolean;
  selected: boolean;
  appointments: Appointment[];
  onSelect: (day: Date) => void;
}

function MobileDay({ day, inMonth, selected, appointments, onSelect }: MobileDayProps) {
  const { t } = useTranslation();
  const today = isToday(day);
  const count = appointments.length;
  const countLabel = `${count} ${t('staff.calendar.appointmentsCount')}`;
  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={selected}
      aria-current={today ? 'date' : undefined}
      aria-label={`${format(day, 'EEEE, MMMM d')}, ${countLabel}`}
      className={cn(
        'flex h-14 min-w-0 flex-col items-center justify-start gap-1 rounded-lg pt-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'bg-accent' : 'hover:bg-accent/60'
      )}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium tabular-nums',
          today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {format(day, 'd')}
      </span>
      <DayDots appointments={appointments} />
    </button>
  );
}

function DayDots({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) return null;
  if (appointments.length > MAX_DOTS) {
    return <span className="text-[10px] font-semibold leading-none tabular-nums text-primary" aria-hidden="true">{appointments.length}</span>;
  }
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {appointments.map((apt) => (
        <StatusDot key={apt.name} status={apt.status} className="h-1.5 w-1.5" />
      ))}
    </span>
  );
}
