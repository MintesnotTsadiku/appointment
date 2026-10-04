import { useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Appointment, TimeSlotInterval } from '../types';
import { slotHeightFor } from '../desk-calendar/layout';

interface AppointmentCardProps {
  appointment: Appointment;
  isDragging?: boolean;
  compact?: boolean;
  timeSlotInterval?: TimeSlotInterval;
  onEdit?: (appointment: Appointment) => void;
  onClick?: (appointment: Appointment) => void;
}

/** Status → accent bar and tint. Text (badge or sr-only) always carries the status too. */
const TONE: Record<string, { bar: string; tint: string }> = {
  Pending: { bar: 'bg-info', tint: 'bg-info/10' },
  Confirmed: { bar: 'bg-success', tint: 'bg-success/10' },
  Completed: { bar: 'bg-muted-foreground/50', tint: 'bg-muted' },
  Cancelled: { bar: 'bg-destructive/60', tint: 'bg-muted' },
  'No Show': { bar: 'bg-warning', tint: 'bg-warning/10' },
};
const DEFAULT_TONE = { bar: 'bg-muted-foreground/50', tint: 'bg-muted' };

type Density = 'xs' | 'sm' | 'full';

/** Calendar event: status accent, time, client and service. Drag by the grip; click to edit. */
export const AppointmentCard = ({ appointment, isDragging: overlay, compact, timeSlotInterval = 30, onEdit, onClick }: AppointmentCardProps) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: appointment.name, data: { appointment } });
  const pointerDown = useRef<{ x: number; y: number; time: number } | null>(null);
  const tone = TONE[appointment.status] ?? DEFAULT_TONE;
  const start = appointment.start_time?.substring(0, 5) || '00:00';
  const end = appointment.end_time?.substring(0, 5) || '00:00';
  const density = densityFor(appointment, timeSlotInterval, compact);
  const cancelled = appointment.status === 'Cancelled';

  const handleMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pointerDown.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  // Only a short, still press counts as a click; anything else was a drag.
  const handleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || isDragging) return;
    const down = pointerDown.current;
    pointerDown.current = null;
    if (down && (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || Date.now() - down.time > 500)) return;
    onClick?.(appointment);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!onClick || e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    onClick(appointment);
  };

  return (
    <div
      ref={setNodeRef}
      data-qa="appointment-card"
      data-qa-appointment-name={appointment.name}
      data-status={appointment.status}
      {...attributes}
      aria-label={`${start}–${end} ${appointment.client_name}, ${appointment.service_name || ''} (${appointment.status})`}
      title={`${start}–${end} · ${appointment.client_name}${appointment.service_name ? ` · ${appointment.service_name}` : ''}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-md border bg-card text-left shadow-sm outline-none transition-shadow',
        'hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        onClick && 'cursor-pointer',
        // The in-grid original fades while its DragOverlay copy (overlay) follows the pointer.
        isDragging && !overlay && 'opacity-50',
        overlay && 'shadow-pop'
      )}
    >
      <div className={cn('absolute inset-0', tone.tint)} aria-hidden="true" />
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden="true" />
      <div className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col pl-2.5 pr-6', density === 'xs' ? 'justify-center py-0.5' : 'gap-0.5 py-1.5')}>
        {density === 'xs' ? (
          <p className="truncate text-xs leading-tight">
            <span className="font-medium tabular-nums text-muted-foreground">{start}</span>{' '}
            <span className={cn('font-semibold text-foreground', cancelled && 'line-through')}>{appointment.client_name}</span>
          </p>
        ) : (
          <>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-xs font-medium tabular-nums text-muted-foreground">
                {start}
                {density === 'full' && `–${end}`}
              </span>
              {density === 'full' && !compact && <StatusBadge status={appointment.status} className="shrink-0 px-1.5 py-0 text-[11px]" />}
            </div>
            <p className={cn('truncate text-sm font-semibold leading-snug text-foreground', compact && 'text-xs', cancelled && 'line-through')}>
              {appointment.client_name}
            </p>
            {appointment.service_name && <p className="truncate text-xs text-muted-foreground">{appointment.service_name}</p>}
            {density === 'full' && (appointment.provider_name || appointment.resource_names?.length) ? (
              <p className="truncate text-xs text-muted-foreground">
                {[appointment.provider_name, ...(appointment.resource_names ?? [])].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        {onEdit && !onClick && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('staff.receptionDesk.editTitle')}
            className="h-6 w-6 [&_svg]:size-3.5"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(appointment);
            }}
          >
            <Pencil />
          </Button>
        )}
        <span
          {...listeners}
          title={t('staff.receptionDesk.dragHint')}
          aria-hidden="true"
          className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};

/** Pick how much to show from the card's real pixel height. */
function densityFor(appointment: Appointment, interval: TimeSlotInterval, compact?: boolean): Density {
  const minutes = durationMinutes(appointment);
  const height = (minutes / interval) * slotHeightFor(interval) - 8;
  if (height < 40) return 'xs';
  if (compact) return height < 56 ? 'xs' : 'sm';
  return height < 84 ? 'sm' : 'full';
}

function durationMinutes(appointment: Appointment) {
  const [sh, sm] = (appointment.start_time || '00:00').split(':').map(Number);
  const [eh, em] = (appointment.end_time || '00:00').split(':').map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : 30;
}
