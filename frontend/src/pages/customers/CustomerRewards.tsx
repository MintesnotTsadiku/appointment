import { useFrappeGetCall } from 'frappe-react-sdk';
import { SettingsSection } from '@/components/settings-layout';
import { RewardList } from '@/components/growth-referrals/RewardList';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API } from '@/lib/referral-link';
import type { CustomerReward } from '@/pages/grow/sections/referrals/types';

interface CustomerRewardsView {
  code: string | null;
  friends_referred: number;
  rewards: CustomerReward[];
}

/** A customer's referral code, friends referred and vouchers. Hidden until the customer takes part. */
export function CustomerRewards({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: CustomerRewardsView }>(
    `${CUSTOMER_REFERRALS_API}.customer_rewards`, { customer_id: customerId }, `customer-rewards-${customerId}`
  );
  const view = data?.message;
  if (!view || (!view.code && !view.rewards.length)) return null;
  return (
    <SettingsSection title={t('staff.referrals.customerTitle')}>
      <div data-qa="customer-rewards" className="space-y-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {view.code && (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{t('staff.referrals.code')}</dt>
              <dd className="font-mono font-medium text-foreground">{view.code}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">{t('staff.referrals.friends')}</dt>
            <dd className="font-medium tabular-nums text-foreground">{view.friends_referred}</dd>
          </div>
        </dl>
        {view.rewards.length ? (
          <RewardList qa="customer-rewards-list" rows={view.rewards} onChanged={() => void mutate()} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('staff.referrals.none')}</p>
        )}
      </div>
    </SettingsSection>
  );
}
