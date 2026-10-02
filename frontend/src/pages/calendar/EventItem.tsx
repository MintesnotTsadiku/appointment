import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/status-badge';
import { shortTime } from './dates';
import { dotTone, eventLabel } from './tones';
import type { Appointment } from './types';

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dotTone(status), className)} />;
}

/** One compact line in a month cell: dot, start time, client. */
export function EventRow({ appointment, onOpen }: { appointment: Appointment; onOpen: (apt: Appointment) => void }) {
  const cancelled = appointment.status === 'Cancelled';
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      aria-label={eventLabel(appointment)}
      title={`${appointment.client_name} · ${appointment.service_name}`}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <StatusDot status={appointment.status} className="h-1.5 w-1.5" />
      <span className="shrink-0 tabular-nums text-muted-foreground">{shortTime(appointment.start_time)}</span>
      <span className={cn('truncate font-medium text-foreground', cancelled && 'text-muted-foreground line-through')}>{appointment.client_name}</span>
    </button>
  );
}

/** A full row for the list view and the mobile day agenda. */
export function AgendaRow({ appointment, onOpen }: { appointment: Appointment; onOpen: (apt: Appointment) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      className="flex w-full min-w-0 items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <div className="w-14 shrink-0 text-sm">
        <div className="font-semibold tabular-nums text-foreground">{shortTime(appointment.start_time)}</div>
        <div className="text-xs tabular-nums text-muted-foreground">{shortTime(appointment.end_time)}</div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-foreground">{appointment.client_name}</span>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="truncate text-sm text-muted-foreground">{appointment.service_name}</p>
        {appointment.location_name && (
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{appointment.location_name}</span>
          </p>
        )}
      </div>
      {Boolean(appointment.amount_paid && appointment.amount_paid > 0) && (
        <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
          {appointment.amount_paid} {appointment.currency || 'ETB'}
        </div>
      )}
    </button>
  );
}
