import { useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Gift, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { Switch } from '@/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { DatePickerButton } from '@/components/growth-referrals/DatePickerButton';
import { useRewardText } from '@/components/growth-referrals/useRewardText';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMER_REFERRALS_API } from '@/lib/referral-link';
import { serverErrorMessage } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { GrowCard } from '../../components';
import { REWARD_STATUS_VARIANT, type CustomerOffer, type CustomerOfferState } from './types';

/** "Bring a friend": the owner's customer referral offer and the vouchers it issued. */
export default function CustomerOfferCard({ business }: { business: string }) {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: CustomerOfferState }>(
    `${CUSTOMER_REFERRALS_API}.get_offer`, { business }, `grow-customer-offer-${business}`
  );
  const state = data?.message;
  if (state && !state.available) return null;
  return (
    <GrowCard qa="grow-customer-offer" icon={Gift} title={t('staff.grow.customerOffer.title')} description={t('staff.grow.customerOffer.description')}>
      {error ? (
        <ErrorState onRetry={() => void mutate()} />
      ) : isLoading || !state ? (
        <ListSkeleton count={2} />
      ) : (
        <div className="space-y-6">
          <OfferForm business={business} saved={state.offer} onSaved={(next) => void mutate({ message: next }, { revalidate: false })} />
          <Rewards state={state} />
        </div>
      )}
    </GrowCard>
  );
}

function OfferForm({ business, saved, onSaved }: { business: string; saved: CustomerOffer; onSaved: (next: CustomerOfferState) => void }) {
  const { t } = useTranslation();
  const reward = useRewardText();
  const [draft, setDraft] = useState(saved);
  const { call, loading } = useFrappePostCall<{ message: CustomerOfferState }>(`${CUSTOMER_REFERRALS_API}.save_offer`);
  useEffect(() => setDraft(saved), [saved]);
  const set = (next: Partial<CustomerOffer>) => setDraft((current) => ({ ...current, ...next }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const invalid = draft.reward_type === 'Percent' ? !(draft.percent >= 1 && draft.percent <= 100) : !draft.reward_text.trim();

  async function save() {
    try {
      const response = await call({
        business, enabled: draft.enabled ? 1 : 0, reward_type: draft.reward_type, percent: draft.percent,
        reward_text: draft.reward_text, ends_on: draft.ends_on || '', friend_gets_offer: draft.friend_gets_offer ? 1 : 0,
      });
      onSaved(response.message);
      toast.success(t('staff.grow.customerOffer.saved'));
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.grow.customerOffer.saveFailed'));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0">
          <Label htmlFor="customer-offer-enabled" className="text-sm font-medium">{t('staff.grow.customerOffer.enabled')}</Label>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('staff.grow.customerOffer.howItWorks')}</p>
        </div>
        <Switch id="customer-offer-enabled" data-qa="customer-offer-enabled" checked={draft.enabled} onCheckedChange={(enabled) => set({ enabled })} className="mt-1" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('staff.grow.customerOffer.rewardType')}</Label>
          <ToggleGroup type="single" value={draft.reward_type} onValueChange={(value) => value && set({ reward_type: value as CustomerOffer['reward_type'] })}
            className="grid w-full grid-cols-2" data-qa="customer-offer-type">
            <ToggleGroupItem value="Percent" className="min-h-10" data-qa="customer-offer-type-percent">{t('staff.grow.customerOffer.percent')}</ToggleGroupItem>
            <ToggleGroupItem value="Custom" className="min-h-10" data-qa="customer-offer-type-custom">{t('staff.grow.customerOffer.custom')}</ToggleGroupItem>
          </ToggleGroup>
          {draft.reward_type === 'Percent' ? (
            <div className="flex items-center gap-2">
              <Input id="customer-offer-percent" data-qa="customer-offer-percent" type="number" inputMode="numeric" min={1} max={100} className="h-11 w-28"
                aria-label={t('staff.grow.customerOffer.percentLabel')} value={draft.percent || ''} onChange={(event) => set({ percent: Number(event.target.value) })} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ) : (
            <Input data-qa="customer-offer-text" className="h-11" maxLength={80} aria-label={t('staff.grow.customerOffer.customLabel')}
              placeholder={t('staff.grow.customerOffer.customPlaceholder')} value={draft.reward_text} onChange={(event) => set({ reward_text: event.target.value })} />
          )}
        </div>
        <div className="space-y-2">
          <Label>{t('staff.grow.customerOffer.whoGets')}</Label>
          <ToggleGroup type="single" value={draft.friend_gets_offer ? 'both' : 'referrer'} onValueChange={(value) => value && set({ friend_gets_offer: value === 'both' })}
            className="grid w-full grid-cols-2" data-qa="customer-offer-who">
            <ToggleGroupItem value="referrer" className="min-h-10" data-qa="customer-offer-who-referrer">{t('staff.grow.customerOffer.referrerOnly')}</ToggleGroupItem>
            <ToggleGroupItem value="both" className="min-h-10" data-qa="customer-offer-who-both">{t('staff.grow.customerOffer.both')}</ToggleGroupItem>
          </ToggleGroup>
          <Label htmlFor="customer-offer-ends" className="block pt-2">{t('staff.grow.customerOffer.endsOn')}</Label>
          <DatePickerButton id="customer-offer-ends" qa="customer-offer-ends" value={draft.ends_on} onChange={(ends_on) => set({ ends_on })}
            placeholder={t('staff.grow.customerOffer.noEnd')} clearLabel={t('staff.grow.customerOffer.clearDate')} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
        <p data-qa="customer-offer-preview" className="min-w-0 text-sm text-foreground">
          {invalid ? t('staff.grow.customerOffer.incomplete') : fill(t(draft.friend_gets_offer ? 'staff.grow.customerOffer.previewBoth' : 'staff.grow.customerOffer.preview'), reward.offer(draft))}
        </p>
        <Button data-qa="customer-offer-save" className="min-h-11 w-full sm:w-auto" disabled={!dirty || invalid || loading} onClick={() => void save()}>
          {t('staff.grow.customerOffer.save')}
        </Button>
      </div>
    </div>
  );
}

function Rewards({ state }: { state: CustomerOfferState }) {
  const { t } = useTranslation();
  const reward = useRewardText();
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('staff.grow.customerOffer.recent')}</h3>
        <span data-qa="customer-offer-counts" className="text-sm text-muted-foreground">
          {fill(t('staff.grow.customerOffer.counts'), state.issued, state.redeemed)}
        </span>
      </div>
      {state.rewards.length ? (
        <ul data-qa="customer-offer-rewards" className="divide-y rounded-xl border">
          {state.rewards.map((row) => (
            <li key={row.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {t(row.role === 'Referrer' ? 'staff.referrals.roleReferrer' : 'staff.referrals.roleFriend')} · {reward.label(row.reward_label)}
                </p>
              </div>
              <Badge variant={REWARD_STATUS_VARIANT[row.status]}>{t(`staff.referrals.status${row.status}`)}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={Ticket} title={t('staff.grow.customerOffer.noRewards')} description={t('staff.grow.customerOffer.noRewardsBody')} />
      )}
    </div>
  );
}
