import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API } from '@/lib/referral-link';
import { serverErrorMessage } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { REWARD_STATUS_VARIANT, type CustomerReward } from '@/pages/grow/sections/referrals/types';
import { useRewardText } from './useRewardText';

/** Customer referral vouchers with a "Mark used" action for issued ones. Staff only. */
export function RewardList({ rows, appointment, onChanged, showCustomer = false, qa }: {
  rows: CustomerReward[];
  appointment?: string;
  onChanged: () => void;
  showCustomer?: boolean;
  qa?: string;
}) {
  const { t } = useTranslation();
  const reward = useRewardText();
  const { call, loading } = useFrappePostCall(`${CUSTOMER_REFERRALS_API}.redeem`);

  async function redeem(name: string) {
    try {
      await call({ reward: name, appointment });
      toast.success(t('staff.referrals.redeemed'));
      onChanged();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.referrals.redeemFailed'));
    }
  }

  return (
    <ul data-qa={qa} className="divide-y rounded-lg border">
      {rows.map((row) => (
        <li key={row.name} data-qa="referral-reward" className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{reward.label(row.reward_label)}</p>
            <p className="text-xs text-muted-foreground">
              {showCustomer ? `${row.customer_name} · ` : ''}
              {t(row.role === 'Referrer' ? 'staff.referrals.roleReferrer' : 'staff.referrals.roleFriend')}
              {row.status === 'Issued' && row.expires_on ? ` · ${fill(t('staff.referrals.expires'), reward.date(row.expires_on))}` : ''}
              {row.status === 'Redeemed' && row.redeemed_at ? ` · ${fill(t('staff.referrals.redeemedOn'), reward.date(row.redeemed_at))}` : ''}
            </p>
          </div>
          {row.status === 'Issued' ? (
            <Button data-qa="referral-reward-redeem" size="sm" variant="outline" className="min-h-9" disabled={loading} onClick={() => void redeem(row.name)}>
              {t('staff.referrals.redeem')}
            </Button>
          ) : (
            <Badge variant={REWARD_STATUS_VARIANT[row.status]}>{t(`staff.referrals.status${row.status}`)}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
