import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { TimeInput } from '@/components/time-input';
import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { StatusBadge } from '@/components/status-badge';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import type { ClockFormat } from '@/lib/time';
import { Appointment } from '../types';
import { BookingHistory } from './BookingHistory';
import { CustomerMessages } from './CustomerMessages';
import { PaymentSection } from './PaymentSection';
import { notificationNotice } from './notificationNotice';

interface OwnedBookingActionsProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

/** Reschedule / cancel an owned (public-site) booking and show its audit trail. */
export function OwnedBookingActions({ appointment, onClose, onSuccess }: OwnedBookingActionsProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState(appointment.start_time.slice(0, 5));
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const [timeValid, setTimeValid] = useState(true);
  const [problem, setProblem] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { call, loading } = useFrappePostCall('appointment.scheduler.booking.change');

  async function change(action: 'reschedule' | 'cancel') {
    setProblem('');
    try {
      const result = await call({ booking_id: appointment.name, action, expected_modified: appointment.modified, date, start_time: time });
      const notice = notificationNotice(result?.message?.notification_status);
      if (notice) toast.info(t(notice));
      onSuccess();
      onClose();
    } catch (e) {
      setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }
  const editable = ['Pending', 'Confirmed'].includes(appointment.status);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent data-qa="owned-booking-dialog" className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 rounded-xl bg-background shadow-pop backdrop-blur-none">
        <DialogHeader className="space-y-1 border-b px-5 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="text-base font-semibold">{t('staff.receptionDesk.manageBooking')}</DialogTitle>
          <DialogDescription>
            {appointment.client_name}
            {appointment.service_name ? ` · ${appointment.service_name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Exact "Status: X" text is asserted by QA. */}
              <p data-qa="booking-current-status" className="font-medium text-foreground">Status: {appointment.status}</p>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="text-muted-foreground">
              {t('staff.receptionDesk.bookingReference')}: <span data-qa="booking-reference" className="font-medium tabular-nums text-foreground">{appointment.appointment_id || appointment.name}</span>
            </p>
            {appointment.last_changed_by === 'Customer' && (
              <p data-qa="booking-changed-by-customer" className="font-medium text-foreground">
                {t('staff.receptionDesk.changedByCustomer')}
              </p>
            )}
            {Boolean(appointment.cancellation_fee || appointment.refund_due) && (
              <p data-qa="booking-fee" className="text-muted-foreground tabular-nums">
                {t('staff.receptionDesk.feeLine')
                  .replace('{0}', `ETB ${Number(appointment.cancellation_fee || 0).toFixed(2)}`)
                  .replace('{1}', `ETB ${Number(appointment.refund_due || 0).toFixed(2)}`)}
              </p>
            )}
            {appointment.customer && (
              <Link data-qa="booking-open-customer" to={`/customers/${appointment.customer}`} className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
                {t('staff.customers.openCustomer')}
              </Link>
            )}
            <p className="text-xs text-muted-foreground">
              {t('staff.receptionDesk.timesIn')} {appointment.booking_timezone || 'Africa/Addis_Ababa'}. {t('staff.receptionDesk.ownedNote')}
            </p>
          </section>

          {problem && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {problem}
            </p>
          )}

          {editable && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('staff.receptionDesk.changeTime')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="booking-change-date">{t('staff.receptionDesk.date')}</Label>
                  <Input id="booking-change-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="booking-change-time">{t('staff.receptionDesk.startTime')}</Label>
                  <TimeInput id="booking-change-time" timeFormat={clockFormat} value={time} onChange={setTime} onValidityChange={setTimeValid} />
                  <ClockFormatToggle value={clockFormat} onChange={setClockFormat} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button data-qa="booking-reschedule" disabled={loading || !date || !time || !timeValid} onClick={() => change('reschedule')}>
                  {t('staff.receptionDesk.saveNewTime')}
                </Button>
                {!confirmCancel && (
                  <Button variant="outline" data-qa="booking-cancel" disabled={loading} onClick={() => setConfirmCancel(true)}>
                    {t('staff.receptionDesk.cancelBooking')}
                  </Button>
                )}
              </div>
              {confirmCancel && (
                <div role="alertdialog" aria-labelledby="booking-cancel-question" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p id="booking-cancel-question" className="text-sm font-medium text-foreground">{t('staff.receptionDesk.cancelQuestion')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" data-qa="booking-confirm-cancel" disabled={loading} onClick={() => change('cancel')}>
                      {t('staff.receptionDesk.confirmCancel')}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                      {t('staff.receptionDesk.keepBooking')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          <PaymentSection appointment={appointment.name} onChanged={onSuccess} />
          <CustomerMessages bookingId={appointment.name} />
          <BookingHistory bookingId={appointment.name} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
