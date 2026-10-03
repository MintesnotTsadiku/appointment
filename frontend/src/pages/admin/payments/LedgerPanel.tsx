import { useEffect, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Panel } from '@/components/analytics/Panels';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { NativeSelect } from '@/components/native-select';
import { ErrorState, ListSkeleton } from '@/components/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { API, STATUS_KEY, TYPE_KEY, formatMoney, type BusinessBalance, type EntryStatus, type LedgerEntry } from './types';

const STATUS_VARIANT = { Due: 'warning', Waived: 'muted', Settled: 'success' } as const;

/** Ledger entries with filters; due entries can be selected and marked settled. */
export function LedgerPanel({ businesses, currency, refreshKey, onSettle }: {
  businesses: BusinessBalance[];
  currency: string;
  refreshKey: number;
  onSettle: (names: string[]) => void;
}) {
  const { t, language } = useTranslation();
  const [organization, setOrganization] = useState('');
  const [status, setStatus] = useState<EntryStatus | ''>('Due');
  const [entryType, setEntryType] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const params = { organization: organization || undefined, status: status || undefined, entry_type: entryType || undefined };
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: { entries: LedgerEntry[]; limit: number } }>(
    `${API}.entries`, params, `admin-ledger-${organization}-${status}-${entryType}`
  );
  const rows = data?.message.entries ?? [];
  const due = rows.filter((row) => row.status === 'Due').map((row) => row.name);
  const dateFormat = new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' });

  useEffect(() => {
    setSelected([]);
    if (refreshKey) void mutate();
  }, [refreshKey, mutate]);
  useEffect(() => setSelected([]), [organization, status, entryType]);

  const toggle = (name: string, on: boolean) => setSelected((current) => (on ? [...current, name] : current.filter((value) => value !== name)));

  return (
    <Panel
      title={t('staff.adminPayments.ledgerTitle')}
      subtitle={t('staff.adminPayments.ledgerSubtitle').replace('{0}', String(data?.message.limit ?? 200))}
      qa="admin-ledger"
      aside={
        <Button type="button" size="sm" data-qa="admin-ledger-settle" disabled={!selected.length} onClick={() => onSettle(selected)}>
          {t('staff.adminPayments.settleSelected').replace('{0}', String(selected.length))}
        </Button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <NativeSelect aria-label={t('staff.adminPayments.colBusiness')} data-qa="admin-ledger-business" value={organization} onChange={(event) => setOrganization(event.target.value)}>
          <option value="">{t('staff.adminPayments.allBusinesses')}</option>
          {businesses.map((row) => <option key={row.organization} value={row.organization}>{row.organization_name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label={t('staff.adminPayments.colStatus')} data-qa="admin-ledger-status" value={status} onChange={(event) => setStatus(event.target.value as EntryStatus | '')}>
          <option value="">{t('staff.adminPayments.allStatuses')}</option>
          {(Object.keys(STATUS_KEY) as EntryStatus[]).map((value) => <option key={value} value={value}>{t(STATUS_KEY[value])}</option>)}
        </NativeSelect>
        <NativeSelect aria-label={t('staff.adminPayments.colType')} data-qa="admin-ledger-type" value={entryType} onChange={(event) => setEntryType(event.target.value)}>
          <option value="">{t('staff.adminPayments.allTypes')}</option>
          {Object.entries(TYPE_KEY).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
        </NativeSelect>
      </div>
      {error ? (
        <ErrorState onRetry={() => void mutate()} />
      ) : isLoading ? (
        <ListSkeleton count={3} />
      ) : (
        <>
        <ul className="space-y-3 sm:hidden">
          {rows.length ? rows.map((row) => (
            <li key={row.name} className="space-y-2 rounded-lg border p-3 text-sm" data-qa="admin-ledger-card" data-qa-state={row.status}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-2">
                  {row.status === 'Due' && (
                    <Checkbox className="mt-0.5" aria-label={t('staff.adminPayments.selectEntry')} checked={selected.includes(row.name)} onCheckedChange={(on) => toggle(row.name, on)} />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">{row.organization_name}</span>
                    <span className="block text-xs text-muted-foreground">{dateFormat.format(new Date(row.creation.replace(' ', 'T')))} · {t(TYPE_KEY[row.entry_type])}</span>
                  </span>
                </label>
                <span className="whitespace-nowrap font-medium tabular-nums">{formatMoney(row.amount, currency)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                {row.booking_reference && <span className="font-mono text-xs">{row.booking_reference}</span>}
              </div>
              {row.note && <p className="whitespace-pre-line break-words text-xs text-muted-foreground">{row.note}</p>}
            </li>
          )) : <li className="py-6 text-center text-muted-foreground">{t('staff.adminPayments.noEntries')}</li>}
        </ul>
        <div className="-mx-5 hidden overflow-x-auto px-5 sm:block">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox aria-label={t('staff.adminPayments.selectEntry')} disabled={!due.length} checked={due.length > 0 && selected.length === due.length} onCheckedChange={(on) => setSelected(on ? due : [])} />
                </TableHead>
                <TableHead>{t('staff.adminPayments.colDate')}</TableHead>
                <TableHead>{t('staff.adminPayments.colBusiness')}</TableHead>
                <TableHead>{t('staff.adminPayments.colBooking')}</TableHead>
                <TableHead>{t('staff.adminPayments.colType')}</TableHead>
                <TableHead className="text-right">{t('staff.adminPayments.colAmount')}</TableHead>
                <TableHead>{t('staff.adminPayments.colStatus')}</TableHead>
                <TableHead>{t('staff.adminPayments.colNote')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? rows.map((row) => (
                <TableRow key={row.name} data-qa="admin-ledger-row" data-qa-state={row.status}>
                  <TableCell>
                    {row.status === 'Due' && (
                      <Checkbox aria-label={t('staff.adminPayments.selectEntry')} checked={selected.includes(row.name)} onCheckedChange={(on) => toggle(row.name, on)} />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{dateFormat.format(new Date(row.creation.replace(' ', 'T')))}</TableCell>
                  <TableCell className="font-medium">{row.organization_name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.booking_reference || '—'}</TableCell>
                  <TableCell>{t(TYPE_KEY[row.entry_type])}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(row.amount, currency)}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[row.status]}>{t(STATUS_KEY[row.status])}</Badge></TableCell>
                  <TableCell className="max-w-[16rem] whitespace-pre-line text-xs text-muted-foreground">{row.note || ''}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t('staff.adminPayments.noEntries')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </Panel>
  );
}
