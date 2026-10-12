import { Store } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Progress } from '@/components/progress';
import { EmptyState } from '@/components/states';
import { useRewardText } from '@/components/growth-referrals/useRewardText';
import { useTranslation } from '@/lib/i18n';
import { progressPercent } from '@/lib/referral-link';
import { fill } from '@/pages/manage-booking/format';
import { REFERRAL_STATUS_VARIANT } from '@/pages/grow/sections/referrals/types';
import type { AdminReferral } from './types';

/** Every business referral, newest first, with its progress toward the reward. */
export function ReferralsPanel({ rows }: { rows: AdminReferral[] }) {
  const { t } = useTranslation();
  const { date } = useRewardText();
  if (!rows.length) return <EmptyState icon={Store} title={t('staff.referralsAdmin.emptyReferrals')} description={t('staff.referralsAdmin.emptyReferralsBody')} />;
  return (
    <ul data-qa="admin-referrals-list" className="divide-y rounded-xl border bg-card">
      {rows.map((row) => (
        <li key={row.name} data-qa="admin-referral-row" className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] md:items-center">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.referred_name}</p>
            <p className="text-xs text-muted-foreground">{fill(t('staff.referralsAdmin.joined'), date(row.joined_on))}</p>
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate text-foreground">{row.referrer_name || '—'}</p>
            <p className="text-xs text-muted-foreground">
              {t(row.referrer_kind === 'Partner' ? 'staff.referralsAdmin.kindPartner' : 'staff.referralsAdmin.kindBusiness')} · <span className="font-mono">{row.referral_code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progressPercent(row.qualifying_bookings, row.threshold)} className="h-2 flex-1" aria-label={t('staff.grow.referrals.progressLabel')} />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fill(t('staff.grow.referrals.bookings'), Math.min(row.qualifying_bookings, row.threshold), row.threshold)}</span>
          </div>
          <Badge variant={REFERRAL_STATUS_VARIANT[row.status]} className="justify-self-start md:justify-self-end">{t(`staff.grow.referrals.status${row.status}`)}</Badge>
        </li>
      ))}
    </ul>
  );
}
