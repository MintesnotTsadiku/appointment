import { Panel } from '@/components/analytics/Panels';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatMoney, type BusinessBalance } from './types';

/** One row per business: what it owes the platform, what the platform owes it, and its exceptions. */
export function BalancesPanel({ rows, currency, onSettle, onEdit }: {
  rows: BusinessBalance[];
  currency: string;
  onSettle: (row: BusinessBalance) => void;
  onEdit: (row: BusinessBalance) => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel title={t('staff.adminPayments.balancesTitle')} subtitle={t('staff.adminPayments.balancesSubtitle')} qa="admin-balances">
      <div className="space-y-3 sm:hidden">
        {rows.length ? rows.map((row) => (
          <div key={row.organization} className="space-y-3 rounded-lg border p-3" data-qa="admin-balance-card" data-qa-org={row.organization}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{row.organization_name}</p>
              <Collects row={row} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <Figure label={t('staff.adminPayments.colFeeDue')} value={formatMoney(row.fee_due, currency)} />
              <Figure label={t('staff.adminPayments.colPayoutDue')} value={formatMoney(row.payout_due, currency)} />
              <Figure label={t('staff.adminPayments.statusSettled')} value={formatMoney(row.settled, currency)} />
            </dl>
            <Actions row={row} onEdit={onEdit} onSettle={onSettle} />
          </div>
        )) : <p className="py-6 text-center text-sm text-muted-foreground">{t('staff.adminPayments.noBusinesses')}</p>}
      </div>
      <div className="-mx-5 hidden overflow-x-auto px-5 sm:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('staff.adminPayments.colBusiness')}</TableHead>
              <TableHead>{t('staff.adminPayments.colCollects')}</TableHead>
              <TableHead className="text-right">{t('staff.adminPayments.colFeeDue')}</TableHead>
              <TableHead className="text-right">{t('staff.adminPayments.colPayoutDue')}</TableHead>
              <TableHead className="text-right">{t('staff.adminPayments.statusSettled')}</TableHead>
              <TableHead className="text-right">{t('staff.adminPayments.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row) => (
              <TableRow key={row.organization} data-qa="admin-balance-row" data-qa-org={row.organization}>
                <TableCell className="font-medium">{row.organization_name}</TableCell>
                <TableCell>
                  <Collects row={row} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(row.fee_due, currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(row.payout_due, currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">{formatMoney(row.settled, currency)}</TableCell>
                <TableCell className="text-right">
                  <Actions row={row} onEdit={onEdit} onSettle={onSettle} className="justify-end" />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t('staff.adminPayments.noBusinesses')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function Collects({ row }: { row: BusinessBalance }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={row.collector === 'Platform' ? 'info' : 'muted'}>
        {row.collector === 'Platform' ? t('staff.adminPayments.platform') : t('staff.adminPayments.colBusiness')}
      </Badge>
      {(row.collection_override !== 'Platform default' || row.override_platform_fee === 1) && (
        <Badge variant="warning">{t('staff.adminPayments.exception')}</Badge>
      )}
    </div>
  );
}

function Actions({ row, onEdit, onSettle, className }: { row: BusinessBalance; onEdit: (row: BusinessBalance) => void; onSettle: (row: BusinessBalance) => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button type="button" size="sm" variant="outline" data-qa="admin-balance-edit" onClick={() => onEdit(row)}>
        {t('staff.adminPayments.edit')}
      </Button>
      <Button type="button" size="sm" data-qa="admin-balance-settle" disabled={row.due_entries === 0} onClick={() => onSettle(row)}>
        {t('staff.adminPayments.settleAll')}
      </Button>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
