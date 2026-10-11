import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Check, Copy, Gift, Send } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API, telegramShare, type OfferTerms } from '@/lib/referral-link';
import { cn } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { useRewardText } from './useRewardText';

interface ShareView extends OfferTerms {
  active: boolean;
  code?: string;
  link?: string;
  business_name?: string;
  friend_gets_offer?: boolean;
  ends_on?: string | null;
}

type Source = { bookingId: string } | { slug?: string; offering?: string; session: string; email: string };

/**
 * "Bring a friend": the customer's personal link to this business, after booking and on My bookings.
 * Renders nothing when the business has no active offer.
 */
export default function CustomerShareCard({ source, className }: { source: Source; className?: string }) {
  const { t } = useTranslation();
  const reward = useRewardText();
  const [copied, setCopied] = useState(false);
  const byBooking = 'bookingId' in source;
  const { data } = useFrappeGetCall<{ message: ShareView }>(
    `${CUSTOMER_REFERRALS_API}.${byBooking ? 'share' : 'my_share'}`,
    byBooking ? { booking_id: source.bookingId } : { slug: source.slug, offering: source.offering, session: source.session, email: source.email },
    byBooking ? (source.bookingId ? `referral-share-${source.bookingId}` : null) : source.session ? `referral-my-share-${source.session}` : null
  );
  const view = data?.message;
  if (!view?.active || !view.link) return null;
  const link = view.link;
  const gift = reward.offer(view);
  const message = fill(t(view.friend_gets_offer ? 'growthReferrals.share.messageBoth' : 'growthReferrals.share.message'), view.business_name || '', gift);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section data-qa="customer-share-card" className={cn('rounded-xl border border-primary/25 bg-primary/5 p-4 text-left sm:p-5', className)}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{t('growthReferrals.share.title')}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fill(t(view.friend_gets_offer ? 'growthReferrals.share.bodyBoth' : 'growthReferrals.share.body'), gift)}
          </p>
          {view.ends_on && <p className="mt-1 text-xs text-muted-foreground">{fill(t('growthReferrals.share.ends'), reward.date(view.ends_on))}</p>}
        </div>
      </div>
      <p data-qa="customer-share-link" className="mt-3 truncate rounded-lg border bg-background px-3 py-2.5 font-mono text-xs text-foreground sm:text-sm" title={link}>
        {link.replace(/^https?:\/\//, '')}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button data-qa="customer-share-telegram" className="min-h-11 w-full" asChild>
          <a href={telegramShare(link, message)} target="_blank" rel="noopener noreferrer">
            <Send aria-hidden="true" />
            {t('growthReferrals.share.telegram')}
          </a>
        </Button>
        <Button data-qa="customer-share-copy" type="button" variant="outline" className="min-h-11 w-full" onClick={() => void copy()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t('growthReferrals.share.copied') : t('growthReferrals.share.copy')}
        </Button>
      </div>
    </section>
  );
}
