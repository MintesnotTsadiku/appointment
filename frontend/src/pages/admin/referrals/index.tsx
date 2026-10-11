import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { BarChart3, Handshake, ListChecks } from 'lucide-react';
import { StaffShell } from '@/components/staff-shell';
import { ErrorState, PageSkeleton } from '@/components/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { REFERRAL_ADMIN_API } from '@/lib/referral-link';
import { fill } from '@/pages/manage-booking/format';
import { PartnersPanel } from './PartnersPanel';
import { ReferralsPanel } from './ReferralsPanel';
import { SourcesPanel } from './SourcesPanel';
import type { ReferralAdminOverview } from './types';

/** Platform administrators: business referrals, where sign-ups come from, and partner applications. */
export default function AdminReferrals() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('referrals');
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: ReferralAdminOverview }>(`${REFERRAL_ADMIN_API}.overview`, undefined, 'admin-referrals');
  const view = data?.message;
  return (
    <StaffShell eyebrow={t('staff.nav.admin')} title={t('staff.referralsAdmin.title')} description={t('staff.referralsAdmin.description')} headingQa="admin-referrals-heading">
      {isLoading ? (
        <PageSkeleton />
      ) : error || !view ? (
        <ErrorState onRetry={() => void mutate()} />
      ) : (
        <div data-qa="admin-referrals" className="space-y-6">
          <Totals view={view} />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 grid h-11 w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="referrals" className="h-9 gap-2 sm:px-5" data-qa="admin-referrals-tab-referrals">
                <ListChecks className="size-4" aria-hidden="true" />
                {t('staff.referralsAdmin.tabReferrals')}
              </TabsTrigger>
              <TabsTrigger value="sources" className="h-9 gap-2 sm:px-5" data-qa="admin-referrals-tab-sources">
                <BarChart3 className="size-4" aria-hidden="true" />
                {t('staff.referralsAdmin.tabSources')}
              </TabsTrigger>
              <TabsTrigger value="partners" className="h-9 gap-2 sm:px-5" data-qa="admin-referrals-tab-partners">
                <Handshake className="size-4" aria-hidden="true" />
                {t('staff.referralsAdmin.tabPartners')}
                {view.totals.pending_partners > 0 && (
                  <span className="rounded-full bg-warning/15 px-1.5 text-xs tabular-nums text-warning">{view.totals.pending_partners}</span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="referrals" className="mt-0"><ReferralsPanel rows={view.referrals} /></TabsContent>
            <TabsContent value="sources" className="mt-0"><SourcesPanel sources={view.sources} /></TabsContent>
            <TabsContent value="partners" className="mt-0"><PartnersPanel rows={view.partners} onChanged={() => void mutate()} /></TabsContent>
          </Tabs>
        </div>
      )}
    </StaffShell>
  );
}

function Totals({ view }: { view: ReferralAdminOverview }) {
  const { t } = useTranslation();
  const tiles = [
    { key: 'pending', label: t('staff.referralsAdmin.totalPending'), value: view.totals.pending + view.totals.qualified },
    { key: 'rewarded', label: t('staff.referralsAdmin.totalRewarded'), value: view.totals.rewarded },
    { key: 'credited', label: t('staff.referralsAdmin.totalCredited'), value: view.totals.credited_free_bookings },
    { key: 'owed', label: t('staff.referralsAdmin.totalOwed'), value: view.totals.partner_payout_owed },
  ];
  return (
    <div className="space-y-2">
      <dl data-qa="admin-referrals-totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.key} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        {view.settings.business_referrals_enabled
          ? fill(t('staff.referralsAdmin.rule'), view.settings.threshold, view.settings.reward, view.settings.partner_reward)
          : t('staff.referralsAdmin.off')}
      </p>
    </div>
  );
}
