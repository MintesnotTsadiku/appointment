import { useTranslation } from '@/lib/i18n';
import { bookingTime, type BookingRef } from './types';

/** Bookings that block an action or still need a resource. */
export function BookingList({ rows, qa }: { rows: BookingRef[]; qa: string }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y rounded-lg border text-sm" data-qa={qa}>
      {rows.map((row) => (
        <li key={row.booking} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2" data-qa={`${qa}-row`}>
          <span className="min-w-0">
            <span className="font-medium">{row.client_name}</span>
            {row.service_name && <span className="text-muted-foreground"> · {row.service_name}</span>}
            {row.provider_name && <span className="text-muted-foreground"> · {row.provider_name}</span>}
            {row.missing?.length ? (
              <span className="block text-xs text-warning">{t('staff.resources.missingLine').replace('{0}', row.missing.join(', '))}</span>
            ) : null}
          </span>
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">{bookingTime(row)}</span>
        </li>
      ))}
    </ul>
  );
}
