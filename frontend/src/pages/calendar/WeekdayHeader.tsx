import { format } from 'date-fns';
import { weekDays } from './dates';

export function WeekdayHeader({ date, short = false }: { date: Date; short?: boolean }) {
  return (
    <div className="grid grid-cols-7 border-b bg-muted/40" aria-hidden="true">
      {weekDays(date).map((day) => (
        <div key={day.toISOString()} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
          {format(day, short ? 'EEEEE' : 'EEE')}
        </div>
      ))}
    </div>
  );
}
