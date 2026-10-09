import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowLeft, Merge } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { SettingsSection } from '@/components/settings-layout';
import { StaffShell } from '@/components/staff-shell';
import { ErrorState, PageSkeleton } from '@/components/states';
import { useBusinessKey } from '@/hooks/useBusinessKey';
import { useTranslation } from '@/lib/i18n';
import { CustomerEditor } from './CustomerEditor';
import { CustomerHistory } from './CustomerHistory';
import { MergeDialog } from './MergeDialog';
import { CUSTOMERS_API, type CustomerDetail } from './types';

/** One customer: details for staff who may edit, history for everyone with access. */
export default function CustomerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const { key: organization, independent } = useBusinessKey();
  const [merging, setMerging] = useState(false);
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: CustomerDetail }>(
    `${CUSTOMERS_API}.get`,
    { customer_id: customerId },
    customerId ? `customer-${customerId}` : null
  );
  const customer = data?.message;
  const canEdit = customer?.role === 'manager' || customer?.role === 'reception';

  const back = (
    <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t('staff.customers.back')}
    </Link>
  );

  return (
    <StaffShell
      title={customer?.display_name ?? t('staff.customers.nav')}
      eyebrow={back}
      headingQa="customer-heading"
      width="default"
      actions={
        customer?.role === 'manager' && customer.status === 'Active' ? (
          <Button data-qa="customer-merge" variant="outline" size="sm" onClick={() => setMerging(true)}>
            <Merge aria-hidden="true" />
            {t('staff.customers.merge')}
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState title={t('staff.customers.loadError')} onRetry={() => mutate()} />
      ) : isLoading || !customer ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-6" data-qa="customer-page">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {customer.status === 'Archived' && <Badge variant="muted">{t('staff.customers.archived')}</Badge>}
            {customer.merged_into && <span>{t('staff.customers.mergedInto')}</span>}
            {customer.possible_duplicate ? <Badge variant="warning">{t('staff.customers.duplicate')}</Badge> : null}
            <span className="tabular-nums">
              {t('staff.customers.bookingCount')}: {customer.booking_count}
            </span>
          </div>
          {canEdit && organization ? (
            <CustomerEditor customer={customer} organization={organization} independent={independent} onSaved={() => mutate()} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('staff.customers.providerView')}</p>
          )}
          <SettingsSection title={t('staff.customers.history')}>
            <CustomerHistory rows={customer.history} />
          </SettingsSection>
          {customer.role === 'manager' && (
            <MergeDialog
              open={merging}
              organization={organization}
              source={customer}
              onClose={() => setMerging(false)}
              onMerged={(target) => {
                setMerging(false);
                navigate(`/customers/${target}`);
              }}
            />
          )}
        </div>
      )}
    </StaffShell>
  );
}
