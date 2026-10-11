import { useFrappeGetCall } from 'frappe-react-sdk';
import { Copy, Handshake, Send, Store } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Progress } from '@/components/progress';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { progressPercent, REFERRALS_API, telegramShare } from '@/lib/referral-link';
import { fill } from '@/pages/manage-booking/format';
import { useRewardText } from '@/components/growth-referrals/useRewardText';
import { copyText, GrowCard } from '../../components';
import { REFERRAL_STATUS_VARIANT, type BusinessReferralOverview, type ReferredBusiness } from './types';

/** Business-to-business referrals: the owner's code and link, and the businesses it brought in. */
export default function BusinessReferralCard({ business }: { business: string }) {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: BusinessReferralOverview }>(
    `${REFERRALS_API}.overview`, { business }, `grow-referrals-${business}`
  );
  const view = data?.message;
  if (view && !view.enabled) return null;
  const threshold = view?.threshold ?? 0;
  const reward = view?.reward ?? 0;
  const rule = fill(t('staff.grow.referrals.rule'), threshold, reward);

  return (
    <GrowCard qa="grow-referrals" icon={Handshake} title={t('staff.grow.referrals.title')} description={view ? rule : undefined}>
      {error ? (
        <ErrorState onRetry={() => void mutate()} />
      ) : isLoading || !view ? (
        <ListSkeleton count={2} />
      ) : (
        <div className="space-y-6">
          <CodePanel view={view} />
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t('staff.grow.referrals.progressTitle')}</h3>
              {Boolean(view.earned_free_bookings) && (
                <span data-qa="grow-referrals-earned" className="text-sm text-muted-foreground">
                  {fill(t('staff.grow.referrals.earnedTotal'), view.earned_free_bookings ?? 0)}
                </span>
              )}
            </div>
            {view.referrals?.length ? (
              <ul data-qa="grow-referrals-list" className="divide-y rounded-xl border">
                {view.referrals.map((row, index) => <ReferredRow key={`${row.name}-${index}`} row={row} threshold={threshold} />)}
              </ul>
            ) : (
              <EmptyState compact icon={Store} title={t('staff.grow.referrals.empty')} description={t('staff.grow.referrals.emptyBody')} />
            )}
          </div>
        </div>
      )}
    </GrowCard>
  );
}

function CodePanel({ view }: { view: BusinessReferralOverview }) {
  const { t } = useTranslation();
  const link = view.link ?? '';
  const message = fill(t('staff.grow.referrals.telegramMessage'), view.product_name ?? '');
  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('staff.grow.referrals.yourCode')}</p>
          <p data-qa="grow-referral-code" className="mt-1 font-mono text-2xl font-semibold tracking-wider text-foreground">{view.code}</p>
        </div>
      </div>
      <p data-qa="grow-referral-link" className="mt-3 break-all text-sm text-muted-foreground">{link.replace(/^https?:\/\//, '')}</p>
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        <Button data-qa="grow-referral-telegram" size="lg" className="w-full sm:w-auto" asChild>
          <a href={telegramShare(link, message)} target="_blank" rel="noopener noreferrer">
            <Send aria-hidden="true" />
            {t('staff.grow.referrals.telegram')}
          </a>
        </Button>
        <Button
          data-qa="grow-referral-copy"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => void copyText(link, t('staff.grow.referrals.copied'), t('staff.grow.referrals.copyFailed'))}
        >
          <Copy aria-hidden="true" />
          {t('staff.grow.referrals.copyLink')}
        </Button>
      </div>
    </div>
  );
}

function ReferredRow({ row, threshold }: { row: ReferredBusiness; threshold: number }) {
  const { t } = useTranslation();
  const { date } = useRewardText();
  return (
    <li data-qa="grow-referral-row" className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{fill(t('staff.grow.referrals.joined'), date(row.joined_on))}</p>
        </div>
        <Badge variant={REFERRAL_STATUS_VARIANT[row.status]}>{t(`staff.grow.referrals.status${row.status}`)}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={progressPercent(row.bookings, threshold)} className="h-2 flex-1" aria-label={t('staff.grow.referrals.progressLabel')} />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fill(t('staff.grow.referrals.bookings'), row.bookings, threshold)}</span>
      </div>
      {row.reward_earned > 0 && (
        <p className="text-xs font-medium text-success">{fill(t('staff.grow.referrals.rewardEarned'), row.reward_earned)}</p>
      )}
    </li>
  );
}
