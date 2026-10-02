import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/dialog';
import { StatusBadge } from '@/components/status-badge';
import { timeRange } from './dates';
import type { Appointment } from './types';

/** Read-only appointment details opened from any calendar view. */
export function AppointmentDetailDialog({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-6 sm:max-w-lg">{appointment && <DetailBody appointment={appointment} />}</DialogContent>
    </Dialog>
  );
}

function DetailBody({ appointment: apt }: { appointment: Appointment }) {
  const { t } = useTranslation();
  const paid = Boolean(apt.amount_paid && apt.amount_paid > 0);
  return (
    <div className="space-y-5">
      <DialogHeader className="space-y-1 text-left">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <DialogTitle className="text-lg font-semibold">{apt.client_name}</DialogTitle>
          <StatusBadge status={apt.status} />
        </div>
        <DialogDescription>{apt.service_name || t('staff.calendar.detail.description')}</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('staff.calendar.detail.date')}>{apt.appointment_date && format(parseISO(apt.appointment_date), 'EEEE, MMMM d, yyyy')}</Field>
        <Field label={t('staff.calendar.detail.time')}>
          <span className="tabular-nums">{timeRange(apt)}</span>
        </Field>
        <Field label={t('staff.calendar.detail.email')}>{apt.client_email}</Field>
        <Field label={t('staff.calendar.detail.phone')}>{apt.client_phone}</Field>
        {apt.location_name && <Field label={t('staff.calendar.detail.location')}>{apt.location_name}</Field>}
        {paid && (
          <Field label={t('staff.calendar.detail.amountPaid')}>
            <span className="tabular-nums">
              {apt.amount_paid} {apt.currency || 'ETB'}
            </span>
          </Field>
        )}
        <Field label={t('staff.calendar.detail.reference')}>{apt.appointment_id || apt.name}</Field>
      </dl>
      {apt.notes && (
        <div className="space-y-1 rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t('staff.calendar.detail.notes')}</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{apt.notes}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{children || '—'}</dd>
    </div>
  );
}
