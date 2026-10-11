import { useFrappeGetCall } from 'frappe-react-sdk';
import { Gift } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { REFERRALS_API } from '@/lib/referral-link';
import { fill } from '@/pages/manage-booking/format';

/** On the sign-up form: who invited this new business owner. Nothing shows for an unknown code. */
export default function ReferralInvite({ code }: { code: string }) {
  const { t } = useTranslation();
  const { data } = useFrappeGetCall<{ message: { valid: boolean; name?: string } }>(`${REFERRALS_API}.code_info`, { code }, `referral-code-${code}`);
  const info = data?.message;
  if (!info?.valid || !info.name) return null;
  return (
    <div data-qa="signup-referral" role="status" className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-gray-900 dark:text-white">{fill(t('growthReferrals.signup.invitedBy'), info.name)}</p>
        <p className="mt-0.5 text-gray-600 dark:text-gray-300">{t('growthReferrals.signup.bonus')}</p>
      </div>
    </div>
  );
}
