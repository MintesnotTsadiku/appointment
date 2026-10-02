import { useFrappeGetCall } from 'frappe-react-sdk';
import { useTranslation } from '@/lib/i18n';

interface HistoryRow {
  name: string;
  owner: string;
  creation: string;
  data: string;
}

const FIELD_LABELS: Record<string, string> = {
  appointment_date: 'Date',
  start_time: 'Start time',
  end_time: 'End time',
  status: 'Status',
  client_name: 'Customer name',
  client_email: 'Email',
  client_phone: 'Phone',
  notes: 'Notes',
};

/** Version log of an owned booking, newest entries as the API returns them. */
export function BookingHistory({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation();
  const { data, error } = useFrappeGetCall<{ message: HistoryRow[] }>('appointment.scheduler.booking.history', { booking_id: bookingId });
  const rows = data?.message ?? [];

  return (
    <section className="space-y-2" data-qa="owned-booking-history">
      <h3 className="text-sm font-semibold text-foreground">{t('staff.receptionDesk.history')}</h3>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t('staff.receptionDesk.historyError')}
        </p>
      )}
      {rows.length > 0 && (
        <ol className="divide-y rounded-lg border text-sm">
          {rows.map((row) => (
            <li key={row.name} className="space-y-0.5 px-3 py-2.5">
              <p className="text-foreground">{describe(row.data)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {row.owner} · {row.creation}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function describe(raw: string) {
  const fallback = 'Booking updated';
  try {
    const detail = JSON.parse(raw);
    if (detail.operation === 'created') return 'Booking created';
    const changes = (detail.changed || [])
      .filter((item: unknown[]) => String(item[0]) in FIELD_LABELS)
      .map((item: unknown[]) => `${FIELD_LABELS[String(item[0])]}: ${item[1]} → ${item[2]}`)
      .join('; ');
    return changes || fallback;
  } catch {
    // Historical entry without structured changes.
    return fallback;
  }
}
