import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Link } from 'react-router-dom';
import { CheckCircle2, HandCoins, ShieldAlert, Wallet } from 'lucide-react';
import { StaffShell } from '@/components/staff-shell';
import { Kpi } from '@/components/analytics/Panels';
import { Button } from '@/components/button';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { BalancesPanel } from './BalancesPanel';
import { BusinessRulesDialog } from './BusinessRulesDialog';
import { LedgerPanel } from './LedgerPanel';
import { PlatformSettingsForm } from './PlatformSettingsForm';
import { SettleDialog } from './SettleDialog';
import { API, formatMoney, type BusinessBalance, type PaymentsOverview } from './types';

/** Platform administrators: balances per business, the ledger, and the platform payment rules. */
export default function AdminPayments() {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: PaymentsOverview }>(`${API}.overview`, undefined, 'admin-payments-overview');
  const [settleTarget, setSettleTarget] = useState<{ names?: string[]; organization?: string; count: number } | null>(null);
  const [editing, setEditing] = useState<BusinessBalance | null>(null);
  const [ledgerRefresh, setLedgerRefresh] = useState(0);
  const overview = data?.message;

  const refreshAll = () => {
    void mutate();
    setLedgerRefresh((value) => value + 1);
  };

  return (
    <StaffShell eyebrow={t('staff.nav.admin')} title={t('staff.adminPayments.title')} description={t('staff.adminPayments.description')} headingQa="admin-payments-heading">
      {isLoading ? (
        <PageSkeleton />
      ) : error ? (
        isPermissionError(error) ? <AccessDenied /> : <ErrorState onRetry={() => void mutate()} />
      ) : overview ? (
        <div className="space-y-6" data-qa="admin-payments">
          <Totals overview={overview} />
          <Tabs defaultValue="balances" className="space-y-4">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="balances" data-qa="admin-tab-balances">{t('staff.adminPayments.tabBalances')}</TabsTrigger>
              <TabsTrigger value="ledger" data-qa="admin-tab-ledger">{t('staff.adminPayments.tabLedger')}</TabsTrigger>
              <TabsTrigger value="settings" data-qa="admin-tab-settings">{t('staff.adminPayments.tabSettings')}</TabsTrigger>
            </TabsList>
            <TabsContent value="balances" className="mt-0">
              <BalancesPanel rows={overview.businesses} currency={overview.currency} onEdit={setEditing}
                onSettle={(row) => setSettleTarget({ organization: row.organization, count: row.due_entries })} />
            </TabsContent>
            <TabsContent value="ledger" className="mt-0">
              <LedgerPanel businesses={overview.businesses} currency={overview.currency} refreshKey={ledgerRefresh}
                onSettle={(names) => setSettleTarget({ names, count: names.length })} />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <PlatformSettingsForm saved={overview.platform} onSaved={() => void mutate()} />
            </TabsContent>
          </Tabs>
          <SettleDialog target={settleTarget} onClose={() => setSettleTarget(null)} onDone={() => { setSettleTarget(null); refreshAll(); }} />
          <BusinessRulesDialog business={editing} platformMode={overview.platform.collection_mode} feeType={overview.platform.platform_fee_type}
            onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void mutate(); }} />
        </div>
      ) : null}
    </StaffShell>
  );
}

function Totals({ overview }: { overview: PaymentsOverview }) {
  const { t } = useTranslation();
  const sum = (key: 'fee_due' | 'payout_due' | 'settled') => overview.businesses.reduce((total, row) => total + (row[key] || 0), 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-qa="admin-payments-totals">
      <Kpi title={t('staff.adminPayments.kpiFeeDue')} value={formatMoney(sum('fee_due'), overview.currency)} Icon={Wallet} />
      <Kpi title={t('staff.adminPayments.kpiPayoutDue')} value={formatMoney(sum('payout_due'), overview.currency)} Icon={HandCoins} />
      <Kpi title={t('staff.adminPayments.statusSettled')} value={formatMoney(sum('settled'), overview.currency)} Icon={CheckCircle2} />
    </div>
  );
}

function AccessDenied() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldAlert}
      title={t('staff.admin.deniedTitle')}
      description={t('staff.admin.deniedDescription')}
      action={
        <Button asChild size="sm">
          <Link to="/home">{t('staff.admin.backHome')}</Link>
        </Button>
      }
    />
  );
}

function isPermissionError(error: unknown) {
  const value = error as { httpStatus?: number; exc_type?: string } | null;
  return value?.httpStatus === 403 || value?.exc_type === 'PermissionError';
}
