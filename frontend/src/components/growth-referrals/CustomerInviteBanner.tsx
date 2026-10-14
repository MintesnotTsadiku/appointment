import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Gift } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API, captureCustomerRef, customerRefFor, type OfferTerms } from '@/lib/referral-link';
import { cn } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { useRewardText } from './useRewardText';

interface Invite extends OfferTerms {
  valid: boolean;
  first_name?: string;
  friend_gets_offer?: boolean;
}

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * "You were invited by <first name>" on the scheduler when the visitor opened a friend's share link.
 * It also keeps the code for this visit so the booking carries it.
 */
export default function CustomerInviteBanner({ slug, offering, providerSlug, className }: { slug?: string; offering?: string; providerSlug?: string; className?: string }) {
  const { t } = useTranslation();
  const reward = useRewardText();
  const [code] = useState(() => {
    captureCustomerRef(window.location.search, window.location.pathname, session());
    return customerRefFor(window.location.search, window.location.pathname, session());
  });
  const { data } = useFrappeGetCall<{ message: Invite }>(
    `${CUSTOMER_REFERRALS_API}.invite`,
    { code, slug, offering, provider_slug: providerSlug },
    code && (slug || offering || providerSlug) ? `referral-invite-${code}-${slug || offering || providerSlug}` : null
  );
  const invite = data?.message;
  if (!invite?.valid || !invite.first_name) return null;
  return (
    <div data-qa="customer-invite-banner" role="status" className={cn('flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-left', className)}>
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-foreground">{fill(t('growthReferrals.invite.title'), invite.first_name)}</p>
        {invite.friend_gets_offer && <p className="mt-0.5 text-muted-foreground">{fill(t('growthReferrals.invite.offer'), reward.offer(invite))}</p>}
      </div>
    </div>
  );
}
