import { format, isSameMonth, isToday } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { monthGridDays } from './dates';
import { EventRow } from './EventItem';
import { MonthMobile } from './MonthMobile';
import { WeekdayHeader } from './WeekdayHeader';
import type { Appointment, MonthViewProps } from './types';

const VISIBLE = 3;

/** Month grid on tablet and desktop; a dot grid plus day agenda on phones. */
export function MonthView(props: MonthViewProps) {
  return (
    <>
      <div className="hidden sm:block">
        <MonthGrid {...props} />
      </div>
      <div className="sm:hidden">
        <MonthMobile {...props} />
      </div>
    </>
  );
}

function MonthGrid({ date, forDay, onOpenDay, onOpen }: MonthViewProps) {
  return (
    <div>
      <WeekdayHeader date={date} />
      <div className="grid grid-cols-7">
        {monthGridDays(date).map((day, index) => (
          <MonthCell key={day.toISOString()} day={day} inMonth={isSameMonth(day, date)} firstColumn={index % 7 === 0} appointments={forDay(day)} onOpenDay={onOpenDay} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

interface MonthCellProps {
  day: Date;
  inMonth: boolean;
  firstColumn: boolean;
  appointments: Appointment[];
  onOpenDay: (day: Date) => void;
  onOpen: (apt: Appointment) => void;
}

function MonthCell({ day, inMonth, firstColumn, appointments, onOpenDay, onOpen }: MonthCellProps) {
  const { t } = useTranslation();
  const hidden = appointments.length - VISIBLE;
  return (
    <div className={cn('flex min-h-[112px] min-w-0 flex-col gap-1 border-b p-1.5', !firstColumn && 'border-l', !inMonth && 'bg-muted/30')}>
      <div className="flex justify-end">
        <DayNumber day={day} inMonth={inMonth} label={`${t('staff.calendar.openDay')} ${format(day, 'EEEE, MMMM d')}`} onClick={() => onOpenDay(day)} />
      </div>
      <div className="min-w-0 space-y-0.5">
        {appointments.slice(0, VISIBLE).map((apt) => (
          <EventRow key={apt.name} appointment={apt} onOpen={onOpen} />
        ))}
        {hidden > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenDay(day)} className="h-auto w-full justify-start px-1.5 py-0.5 text-xs font-medium text-primary">
            +{hidden}<span className="sr-only"> {t('staff.calendar.moreEvents')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function DayNumber({ day, inMonth, label, onClick }: { day: Date; inMonth: boolean; label: string; onClick: () => void }) {
  const today = isToday(day);
  return (
    <Button
      type="button"
      variant={today ? 'default' : 'ghost'}
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-current={today ? 'date' : undefined}
      className={cn('h-7 w-7 rounded-full text-xs tabular-nums', !today && (inMonth ? 'text-foreground' : 'text-muted-foreground'))}
    >
      {format(day, 'd')}
    </Button>
  );
}

