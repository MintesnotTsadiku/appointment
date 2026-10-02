import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentCard } from '../components/AppointmentCard';
import type { Appointment, TimeSlotInterval } from '../types';
import { HEADER_PX, fallbackPosition, layoutAppointments, nowOffset, type CardLayout, type Slot } from './layout';
import { TimeSlot } from './TimeSlot';

interface DayColumnProps {
  date: Date;
  appointments: Appointment[];
  slots: Slot[];
  interval: TimeSlotInterval;
  slotPx: number;
  /** Week columns are narrow: compact cards and "+N more" instead of overflow cards. */
  week: boolean;
  dragging: boolean;
  onEdit: (appointment: Appointment) => void;
  onOverflow: (date: Date, appointments: Appointment[]) => void;
  onCreate?: (date: Date, time: string) => void;
}

export function DayColumn({ date, appointments, slots, interval, slotPx, week, dragging, onEdit, onOverflow, onCreate }: DayColumnProps) {
  const layouts = layoutAppointments(appointments, interval, slotPx);
  const today = isToday(date);
  return (
    <div className={cn('relative min-w-0 flex-1', week ? 'min-w-[120px] border-r last:border-r-0' : 'pl-3')}>
      <DayHeader date={date} today={today} week={week} />
      {slots.map((slot, index) => (
        <TimeSlot key={`${slot.hour}-${slot.minute}-${index}`} date={date} slot={slot} interval={interval} heightPx={slotPx} dragging={dragging} onCreate={onCreate} />
      ))}
      {today && <NowLine top={nowOffset(interval, slotPx)} />}
      {appointments.map((appointment) => {
        const layout = layouts.get(appointment.name);
        if (layout?.isOverflow && week) return null;
        const style = layout ? columnStyle(layout) : fallbackStyle(appointment, interval, slotPx, week);
        if (!style) return null;
        return (
          <motion.div key={appointment.name} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="absolute z-10" style={style}>
            <AppointmentCard appointment={appointment} onEdit={onEdit} onClick={onEdit} compact={week || (layout?.totalColumns ?? 1) > 1} timeSlotInterval={interval} />
            {week && layout?.overflowCount ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOverflow(layout.overflowDate || date, layout.overflowAppointments || []);
                }}
                className="absolute bottom-0 left-0 right-0 rounded-b-md border-t bg-card p-1 text-[10px] font-semibold text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                +{layout.overflowCount} more
              </button>
            ) : null}
          </motion.div>
        );
      })}
      {!week && appointments.length === 0 && <EmptyDay />}
    </div>
  );
}

function DayHeader({ date, today, week }: { date: Date; today: boolean; week: boolean }) {
  return (
    <div
      className={cn('sticky top-0 z-10 flex flex-col items-center justify-center border-b bg-card', week && today && 'bg-accent')}
      style={{ height: HEADER_PX }}
    >
      <span className={cn('text-xs font-medium', today ? 'text-primary' : 'text-muted-foreground')}>{format(date, 'EEE')}</span>
      <span
        className={cn(
          'mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-lg font-semibold tabular-nums',
          today ? 'bg-primary text-primary-foreground' : 'text-foreground'
        )}
      >
        {format(date, 'd')}
      </span>
    </div>
  );
}

function NowLine({ top }: { top: number }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top }} aria-hidden="true">
      <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />
      <span className="h-0.5 flex-1 bg-destructive" />
    </div>
  );
}

function EmptyDay() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
      <div className="rounded-lg border border-dashed bg-card/90 px-6 py-5 text-center backdrop-blur-sm">
        <CalendarX className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No appointments scheduled</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Select a time slot or use “New appointment”.</p>
      </div>
    </div>
  );
}

function columnStyle(layout: CardLayout): CSSProperties {
  const multi = layout.totalColumns > 1;
  return {
    top: `${layout.top + HEADER_PX}px`,
    height: `${layout.height}px`,
    left: `calc(${layout.left}% + 0px)`,
    width: `calc(${layout.width}% - ${multi ? '0.5%' : '0px'})`,
    padding: `4px ${multi ? '0.5%' : '4px'} 4px 4px`,
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
}

function fallbackStyle(appointment: Appointment, interval: TimeSlotInterval, slotPx: number, week: boolean): CSSProperties | null {
  const position = fallbackPosition(appointment, interval, slotPx);
  if (!position) return null;
  return {
    top: `${position.top + HEADER_PX}px`,
    height: `${position.height}px`,
    left: '0px',
    right: week ? '8px' : '12px',
    padding: '4px',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
}
