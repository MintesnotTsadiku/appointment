import { CalendarClock, MapPin, Scissors, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatWhen } from './format';
import type { ManageView } from './types';

/** The booking facts in the booking's own time zone. */
export function BookingSummary({ view }: { view: ManageView }) {
  const { t, language } = useTranslation();
  const { booking } = view;
  return (
    <dl data-qa="manage-summary" className="grid gap-4 sm:grid-cols-2">
      <Fact icon={<CalendarClock aria-hidden="true" />} label={t('customerBooking.dateTime')}>
        <span data-qa="manage-when">{formatWhen(booking.starts_at, booking.timezone, language)}</span>
        <span className="block text-xs text-[var(--text-secondary)]">
          {booking.duration_minutes} {t('customerBooking.minutes')} · {booking.timezone.replace(/_/g, ' ')}
        </span>
      </Fact>
      <Fact icon={<Scissors aria-hidden="true" />} label={t('customerBooking.service')}>
        {booking.service}
      </Fact>
      {booking.provider && (
        <Fact icon={<UserRound aria-hidden="true" />} label={t('customerEmail.provider')}>
          {booking.provider}
        </Fact>
      )}
      {booking.location && (
        <Fact icon={<MapPin aria-hidden="true" />} label={t('customerBooking.location')}>
          {booking.location}
          {booking.address && <span className="block text-xs text-[var(--text-secondary)]">{booking.address}</span>}
        </Fact>
      )}
    </dl>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
        <dd className="font-medium text-[var(--text-primary)]">{children}</dd>
      </div>
    </div>
  );
}
