import { useCallback } from 'react';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { percentFromLabel, type OfferTerms } from '@/lib/referral-link';
import { fill } from '@/pages/manage-booking/format';

/** Reward wording in the current language: "10% off your next visit", or the owner's own words. */
export function useRewardText() {
  const { t, language } = useTranslation();
  const offer = useCallback(
    (terms: OfferTerms) => (terms.reward_type === 'Custom' ? terms.reward_text : fill(t('growthReferrals.reward.percentOff'), terms.percent)),
    [t]
  );
  const label = useCallback(
    (value?: string | null) => {
      const percent = percentFromLabel(value);
      return percent === null ? value || '' : fill(t('growthReferrals.reward.percentOff'), percent);
    },
    [t]
  );
  const date = useCallback(
    (value?: string | null) =>
      value ? new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '',
    [language]
  );
  return { offer, label, date };
}
