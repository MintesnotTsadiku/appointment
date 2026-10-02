import { useFrappeGetCall } from 'frappe-react-sdk';
import { Badge } from '@/components/badge';
import { useTranslation } from '@/lib/i18n';

export interface CustomerMessage {
  name: string;
  appointment?: string;
  event: 'Confirmation' | 'Reschedule' | 'Cancellation' | 'Reminder';
  channel: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Failed' | 'Skipped';
  skip_reason?: string | null;
  creation: string;
}

const STATUS_VARIANT = { Queued: 'info', Sent: 'success', Delivered: 'success', Failed: 'destructive', Skipped: 'muted' } as const;

/** One line per customer message: event, time, channel and delivery status. */
export function MessageRows({ rows, showBooking = false }: { rows: CustomerMessage[]; showBooking?: boolean }) {
  const { t } = useTranslation();
  return (
    <ol className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <li key={row.name} data-qa="customer-message" className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-foreground">{t(`staff.notifications.event.${row.event}`)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {showBooking && row.appointment ? `${row.appointment} · ` : ''}
              {row.channel} · {row.creation.slice(0, 16)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[row.status] ?? 'muted'} data-qa-state={row.status}>
            {t(`staff.notifications.status.${row.status}`)}
            {row.skip_reason ? ` · ${t(`staff.notifications.reason.${row.skip_reason}`)}` : ''}
          </Badge>
        </li>
      ))}
    </ol>
  );
}

/** Customer messages for one booking, shown in the reception booking dialog. */
export function CustomerMessages({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation();
  const { data, error } = useFrappeGetCall<{ message: CustomerMessage[] }>(
    'appointment.scheduler.notifications.for_appointment',
    { booking_id: bookingId },
    `customer-messages-${bookingId}`
  );
  const rows = data?.message ?? [];

  return (
    <section className="space-y-2" data-qa="customer-messages">
      <h3 className="text-sm font-semibold text-foreground">{t('staff.settings.notifications.title')}</h3>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t('staff.notifications.loadError')}
        </p>
      )}
      {!error && data && rows.length === 0 && <p className="text-sm text-muted-foreground">{t('staff.notifications.empty')}</p>}
      {rows.length > 0 && <MessageRows rows={rows} />}
    </section>
  );
}
