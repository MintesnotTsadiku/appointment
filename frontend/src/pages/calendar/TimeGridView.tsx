import { format, isToday } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { timeRange } from './dates';
import { blockTone, eventLabel } from './tones';
import { HOUR_PX, hourWindow, placeEvents, type PlacedEvent } from './timeLayout';
import type { Appointment } from './types';

interface TimeGridViewProps {
  days: Date[];
  forDay: (day: Date) => Appointment[];
  onOpen: (apt: Appointment) => void;
  /** Week view only: day headers open that day. */
  onOpenDay?: (day: Date) => void;
}

/** Hour grid shared by the week (7 columns) and day (1 column) views. */
export function TimeGridView({ days, forDay, onOpen, onOpenDay }: TimeGridViewProps) {
  const perDay = days.map((day) => ({ day, appointments: forDay(day) }));
  const { first, last } = hourWindow(perDay.flatMap((entry) => entry.appointments));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const wide = days.length > 1;

  return (
    <div className="overflow-x-auto">
      <div className={cn('flex', wide && 'min-w-[720px]')}>
        <TimeGutter hours={hours} />
        {perDay.map(({ day, appointments }, index) => (
          <div key={day.toISOString()} className={cn('min-w-0 flex-1', index > 0 && 'border-l')}>
            <DayHeading day={day} onOpenDay={onOpenDay} />
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((hour) => (
                <div key={hour} className="border-b border-border/60" style={{ height: HOUR_PX }} />
              ))}
              {placeEvents(appointments, first).map((event) => (
                <TimeBlock key={event.appointment.name} event={event} compact={wide} onOpen={onOpen} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HEADING_CLASS = 'flex h-14 w-full flex-col items-center justify-center gap-0.5 border-b';

function DayHeading({ day, onOpenDay }: { day: Date; onOpenDay?: (day: Date) => void }) {
  const { t } = useTranslation();
  const today = isToday(day);
  const content = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</span>
      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums', today ? 'bg-primary text-primary-foreground' : 'text-foreground')}>
        {format(day, 'd')}
      </span>
    </>
  );
  if (!onOpenDay) return <div className={HEADING_CLASS}>{content}</div>;
  return (
    <button
      type="button"
      onClick={() => onOpenDay(day)}
      aria-label={`${t('staff.calendar.openDay')} ${format(day, 'EEEE, MMMM d')}`}
      aria-current={today ? 'date' : undefined}
      className={cn(HEADING_CLASS, 'transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
    >
      {content}
    </button>
  );
}

function TimeGutter({ hours }: { hours: number[] }) {
  return (
    <div className="w-14 shrink-0 border-r" aria-hidden="true">
      <div className="h-14 border-b" />
      {hours.map((hour) => (
        <div key={hour} className="flex justify-end border-b border-transparent pr-2" style={{ height: HOUR_PX }}>
          <span className="pt-1 text-[11px] font-medium tabular-nums text-muted-foreground">{String(hour).padStart(2, '0')}:00</span>
        </div>
      ))}
    </div>
  );
}

function TimeBlock({ event, compact, onOpen }: { event: PlacedEvent; compact: boolean; onOpen: (apt: Appointment) => void }) {
  const { appointment: apt, top, height, lane, lanes } = event;
  const width = 100 / lanes;
  const roomy = height >= 48;
  return (
    <button
      type="button"
      onClick={() => onOpen(apt)}
      aria-label={eventLabel(apt)}
      title={`${apt.client_name} · ${apt.service_name}`}
      className={cn(
        'absolute z-10 flex flex-col overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-xs text-foreground transition-shadow hover:shadow-card focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        blockTone(apt.status),
        apt.status === 'Cancelled' && 'opacity-70'
      )}
      style={{ top: top + 1, height: height - 2, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
    >
      <span className="truncate font-semibold">{apt.client_name}</span>
      {roomy && <span className="truncate tabular-nums text-muted-foreground">{timeRange(apt)}</span>}
      {roomy && !compact && <span className="truncate text-muted-foreground">{apt.service_name}</span>}
    </button>
  );
}
