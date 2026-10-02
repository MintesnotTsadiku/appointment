import { format } from 'date-fns';
import { CalendarDays, ChevronRight, MapPin, User } from 'lucide-react';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/dialog';
import { StatusBadge } from '@/components/status-badge';
import { useTranslation } from '@/lib/i18n';
import type { Appointment } from '../types';

interface OverflowAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  appointments: Appointment[];
  onEdit?: (appointment: Appointment) => void;
  onNavigateToDay?: (date: Date) => void;
  viewMode: 'day' | 'week';
}

/** Every appointment of a crowded week-view day, each opening the editor. */
export const OverflowAppointmentsModal = ({
  isOpen,
  onClose,
  date,
  appointments,
  onEdit,
  onNavigateToDay,
  viewMode,
}: OverflowAppointmentsModalProps) => {
  const { t } = useTranslation();
  const edit = onEdit
    ? (appointment: Appointment) => {
        onEdit(appointment);
        onClose();
      }
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-qa="overflow-appointments-modal" className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 rounded-xl bg-background shadow-pop backdrop-blur-none">
        <DialogHeader className="space-y-1 border-b px-5 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="text-base font-semibold">{format(date, 'EEEE, MMM d, yyyy')}</DialogTitle>
          <DialogDescription className="tabular-nums">
            {appointments.length} {t('staff.receptionDesk.appointmentsCount')}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
          {viewMode === 'week' && onNavigateToDay && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onNavigateToDay(date);
                onClose();
              }}
            >
              <CalendarDays aria-hidden="true" />
              {t('staff.receptionDesk.openDayView')}
            </Button>
          )}
          <ul className="space-y-2">
            {appointments.map((appointment) => (
              <li key={appointment.name}>
                <OverflowRow appointment={appointment} onEdit={edit} />
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function OverflowRow({ appointment, onEdit }: { appointment: Appointment; onEdit?: (appointment: Appointment) => void }) {
  const body = (
    <>
      <span className="block min-w-0 flex-1 space-y-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {appointment.start_time?.substring(0, 5) || '00:00'} – {appointment.end_time?.substring(0, 5) || '00:00'}
          </span>
          <StatusBadge status={appointment.status} />
        </span>
        <span className="block truncate text-sm font-semibold text-foreground">{appointment.client_name}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="truncate">{appointment.service_name}</span>
          {appointment.provider_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden="true" />
              {appointment.provider_name}
            </span>
          )}
          {appointment.location_name && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {appointment.location_name}
            </span>
          )}
        </span>
        {appointment.notes && <span className="line-clamp-2 text-xs text-muted-foreground">{appointment.notes}</span>}
      </span>
      {onEdit && <ChevronRight className="text-muted-foreground" aria-hidden="true" />}
    </>
  );

  if (!onEdit) return <div className="flex items-start gap-3 rounded-lg border bg-card p-3">{body}</div>;
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onEdit(appointment)}
      className="h-auto w-full items-start justify-between gap-3 whitespace-normal rounded-lg bg-card p-3 font-normal"
    >
      {body}
    </Button>
  );
}
