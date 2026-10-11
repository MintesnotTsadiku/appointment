import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Gift } from 'lucide-react';
import { RewardList } from '@/components/growth-referrals/RewardList';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API } from '@/lib/referral-link';
import type { CustomerReward } from '@/pages/grow/sections/referrals/types';

interface BookingReferralView {
  referred_by: { customer: string; name: string } | null;
  issued: CustomerReward[];
  vouchers: CustomerReward[];
}

/** "Referred by <customer>" and the customer's unused referral rewards, on the booking detail. */
export function BookingReferral({ appointment }: { appointment: string }) {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: BookingReferralView }>(
    `${CUSTOMER_REFERRALS_API}.booking_referral`, { appointment }, `booking-referral-${appointment}`
  );
  const view = data?.message;
  if (!view || (!view.referred_by && !view.vouchers.length)) return null;
  return (
    <section data-qa="booking-referral" className="space-y-3 rounded-lg border p-4">
      {view.referred_by && (
        <p data-qa="booking-referred-by" className="flex items-center gap-2 text-sm text-foreground">
          <Gift className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {t('staff.referrals.referredBy')}{' '}
            <Link to={`/customers/${encodeURIComponent(view.referred_by.customer)}`} className="font-medium underline underline-offset-4">
              {view.referred_by.name}
            </Link>
          </span>
        </p>
      )}
      {view.vouchers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('staff.referrals.vouchers')}</h4>
          <RewardList qa="booking-referral-vouchers" rows={view.vouchers} appointment={appointment} onChanged={() => void mutate()} />
        </div>
      )}
    </section>
  );
}
