import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ChevronLeft, ChevronRight, Plus, Search, UserRound } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { StaffShell } from '@/components/staff-shell';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { NewCustomerDialog } from './NewCustomerDialog';
import { useDebounced } from './useDebounced';
import { CUSTOMERS_API, type CustomerSummary, type SearchResult } from './types';

/** Customers of the selected business, with search and paging. */
export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const organization = useSession().session?.selected?.organization;
  const [text, setText] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const query = useDebounced(text.trim(), 300);
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: SearchResult }>(
    `${CUSTOMERS_API}.search`,
    { organization, query, page },
    organization ? `customers-${organization}-${query}-${page}` : null
  );
  const result = data?.message;
  const canEdit = result?.role === 'manager' || result?.role === 'reception';

  return (
    <StaffShell
      title={t('staff.customers.nav')}
      description={t('staff.customers.description')}
      headingQa="customers-heading"
      actions={
        canEdit ? (
          <Button data-qa="customers-new" size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            {t('staff.customers.new')}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="customer-search" className="sr-only">
            {t('staff.customers.searchLabel')}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="customer-search"
              data-qa="customers-search"
              type="search"
              className="pl-9"
              placeholder={t('staff.customers.searchPlaceholder')}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>

        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading || !result ? (
          <ListSkeleton count={6} />
        ) : result.customers.length === 0 ? (
          <EmptyState icon={UserRound} title={query ? t('staff.customers.empty') : t('staff.customers.emptyAll')} />
        ) : (
          <CustomerList rows={result.customers} showContact={canEdit} />
        )}

        {result && (page > 0 || result.has_more) && (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label={t('staff.customers.previousPage')}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">{page + 1}</span>
            <Button data-qa="customers-next" variant="outline" size="sm" disabled={!result.has_more} onClick={() => setPage((p) => p + 1)} aria-label={t('staff.customers.nextPage')}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {organization && (
        <NewCustomerDialog
          open={creating}
          organization={organization}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/customers/${id}`)}
        />
      )}
    </StaffShell>
  );
}

function CustomerList({ rows, showContact }: { rows: CustomerSummary[]; showContact: boolean }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y rounded-xl border bg-card" data-qa="customers-list">
      {rows.map((row) => (
        <li key={row.name}>
          <Link
            to={`/customers/${row.name}`}
            data-qa="customer-row"
            className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                {row.display_name}
                {row.possible_duplicate ? <Badge variant="warning">{t('staff.customers.duplicate')}</Badge> : null}
              </span>
              {showContact && (
                <span className="block truncate text-xs text-muted-foreground">
                  {[row.primary_phone, row.primary_email].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <span className="flex gap-4 text-xs text-muted-foreground tabular-nums">
              <span>
                {t('staff.customers.bookingCount')}: {row.booking_count}
              </span>
              {row.last_booking && (
                <span>
                  {t('staff.customers.lastBooking')}: {row.last_booking}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
