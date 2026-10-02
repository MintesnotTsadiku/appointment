import { StatusBadge } from '@/components/status-badge';
import { useTranslation } from '@/lib/i18n';
import type { CustomerHistoryRow } from './types';

/** The customer's bookings, newest first, limited to what the viewer may see. */
export function CustomerHistory({ rows }: { rows: CustomerHistoryRow[] }) {
  const { t } = useTranslation();
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t('staff.customers.historyEmpty')}</p>;
  return (
    <ol className="divide-y rounded-lg border text-sm" data-qa="customer-history">
      {rows.map((row) => (
        <li key={row.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-medium text-foreground tabular-nums">
              {row.appointment_date} · {String(row.start_time).slice(0, 5)}
            </p>
            <p className="text-xs text-muted-foreground">
              {[row.service_name, row.provider_name, row.location_name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <StatusBadge status={row.status} />
        </li>
      ))}
    </ol>
  );
}
