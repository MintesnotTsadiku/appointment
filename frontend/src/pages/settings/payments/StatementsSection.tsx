import { useMemo, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Download } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { SettingsSection } from '@/components/settings-layout';
import { ErrorState, ListSkeleton } from '@/components/states';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { API, statementUrl } from './statementUrl';

interface Totals {
  collected_business: number;
  collected_platform: number;
  refunded_business: number;
  refunded_platform: number;
  fees_due: number;
  fees_waived: number;
  fees_settled: number;
  payouts_due: number;
  payouts_settled: number;
  net: number;
}

interface Statement {
  month: string;
  currency: string;
  timezone: string;
  totals: Totals;
  payments: unknown[];
  refunds: unknown[];
  fees: unknown[];
  payouts: unknown[];
}

/** The last 12 months, newest first, as "YYYY-MM". */
function recentMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

/** One month of payments, refunds, platform fees and payouts, with PDF and CSV downloads. */
export function StatementsSection({ organization }: { organization: string }) {
  const { t, language } = useTranslation();
  const months = useMemo(recentMonths, []);
  const [month, setMonth] = useState(months[0]);
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Statement }>(
    `${API}.get_statement`, { organization, month }, `statement-${organization}-${month}`
  );
  const monthName = (value: string) => {
    const [year, number] = value.split('-').map(Number);
    return new Date(year, number - 1, 1).toLocaleDateString(intlLocale(language), { month: 'long', year: 'numeric' });
  };
  const statement = data?.message;
  const money = (value: number) => `${statement?.currency ?? 'ETB'} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const count = statement ? statement.payments.length + statement.refunds.length + statement.fees.length + statement.payouts.length : 0;

  return (
    <SettingsSection title={t('staff.statements.title')} description={t('staff.statements.description')}>
      <div className="space-y-4" data-qa="payment-statements">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5 sm:w-60">
            <Label htmlFor="statement-month">{t('staff.statements.month')}</Label>
            <NativeSelect id="statement-month" data-qa="statement-month" value={month} onChange={(event) => setMonth(event.target.value)}>
              {months.map((value) => <option key={value} value={value}>{monthName(value)}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a data-qa="statement-pdf" download href={statementUrl(organization, month, 'pdf', language)}>
                <Download aria-hidden="true" />
                PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a data-qa="statement-csv" download href={statementUrl(organization, month, 'csv', language)}>
                <Download aria-hidden="true" />
                CSV
              </a>
            </Button>
          </div>
        </div>
        {error ? (
          <ErrorState onRetry={() => void mutate()} />
        ) : isLoading || !statement ? (
          <ListSkeleton count={2} />
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground" data-qa="statement-empty">{t('staff.statements.empty')}</p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2" data-qa="statement-totals">
            {([
              ['collectedBusiness', statement.totals.collected_business],
              ['collectedPlatform', statement.totals.collected_platform],
              ['refunded', statement.totals.refunded_business],
              ['feesDue', statement.totals.fees_due],
              ['feesSettled', statement.totals.fees_settled],
              ['payouts', statement.totals.payouts_due + statement.totals.payouts_settled],
            ] as const).map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-4 border-b py-1.5">
                <dt className="text-muted-foreground">{t(`staff.statements.${key}`)}</dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">{money(value)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 py-1.5 sm:col-span-2" data-qa="statement-net">
              <dt className="font-semibold">{t('staff.statements.net')}</dt>
              <dd className="whitespace-nowrap text-base font-semibold tabular-nums">{money(statement.totals.net)}</dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-muted-foreground">{t('staff.statements.emailed')}</p>
      </div>
    </SettingsSection>
  );
}
