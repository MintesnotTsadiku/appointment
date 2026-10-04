import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { AlertTriangle, ArrowUpRight, BarChart3, Download } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { buttonVariants } from '@/components/button';
import { PageHeader } from '@/components/staff-shell';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardControls } from '@/components/dashboard/DashboardControls';
import { AddWidgetSheet } from '@/components/dashboard/AddWidgetSheet';
import { GuideSheet } from '@/components/dashboard/GuideSheet';
import { useDashboard } from '@/components/dashboard/useDashboard';
import type { DashboardPage } from '@/components/dashboard/types';
import { DashboardFilters } from './DashboardFilters';
import { initialFilters, type Filters } from './dashboardFilterTypes';
import type { Metric } from './MetricWidget';
import type { Report } from './types';

export interface DashboardHeader {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  headingQa?: string;
  /** Page actions shown next to the dashboard controls. */
  actions?: ReactNode;
  /** Rendered between the header and the widgets (e.g. a publishing notice). */
  notice?: ReactNode;
}

/** The overview report plus the metric catalog and filter choices added by the split analytics backend. */
type ScopedReport = Report & { metrics?: Record<string, Metric>; filter_options?: Record<string, string[]> };

/**
 * The reporting scope: the selected business, or `Provider:<name>` for an
 * independent provider who runs their own business.
 */
export function useAnalyticsScope() {
  const { session } = useSession();
  const independent = session?.state === 'individual_owner';
  const solo = useFrappeGetCall<{ message: { provider: string } }>(
    'appointment.scheduler.independent.workspace',
    undefined,
    independent ? `independent-dashboard-${session?.user}` : null
  );
  const provider = solo.data?.message.provider;
  const organization = session?.selected?.organization || (independent && provider ? `Provider:${provider}` : undefined);
  const selected = session?.selected;
  const manager = Boolean(selected?.is_manager || selected?.role === 'Owner' || selected?.role === 'Manager' || independent);
  // Cache keys carry the viewer's scope so one user's figures never serve another.
  const scope = JSON.stringify([session?.user, session?.state, selected?.role, selected?.is_manager, selected?.provider, selected?.locations]);
  return { organization, manager, scope, provider, loading: independent && solo.isLoading, businessName: selected?.business_name ?? provider ?? '' };
}

function useScopedReport(organization: string | undefined, period: number, scope: string, filters?: string) {
  return useFrappeGetCall<{ message: ScopedReport }>(
    'appointment.scheduler.analytics.overview',
    { organization: organization || '', period, ...(filters ? { filters } : {}) },
    organization ? `analytics-${scope}-${organization}-${period}-${filters || ''}` : null,
    { revalidateOnFocus: true }
  );
}

/** Compact metrics strip for the provider schedule and reception desk. */
export function InsightBrief({ kind }: { kind: 'provider' | 'reception' }) {
  const { t } = useTranslation();
  const { organization, scope } = useAnalyticsScope();
  const { data, error } = useScopedReport(organization, 7, scope);
  if (!organization || error || !data?.message) return null;
  const report = data.message;
  const items = [
    [report.today_confirmed, t('staff.analytics.brief.confirmedToday')],
    [report.next_seven_days, t('staff.analytics.brief.upcoming')],
    [report.current.completed, t('staff.analytics.brief.completedWeek')],
    [report.current.no_show_rate.available ? `${report.current.no_show_rate.rate}%` : '—', t('staff.analytics.brief.noShow')],
    [report.current.utilization.available ? `${report.current.utilization.rate}%` : '—', t('staff.analytics.brief.utilization')],
  ] as const;
  return (
    <section data-qa={`${kind}-insight-brief`} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-card">
      <strong className="text-foreground">{kind === 'provider' ? t('staff.analytics.brief.yourWeek') : t('staff.analytics.brief.reception')}</strong>
      {items.map(([value, label]) => (
        <span key={label} className="text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">{value}</b> {label}
        </span>
      ))}
      <Link to="/analytics" className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t('staff.analytics.brief.view')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

/** Customizable widget dashboard used by Overview (`/home`) and Insights (`/analytics`). */
export default function WorkspaceDashboard({ page = 'insights', header = {} }: { page?: DashboardPage; header?: DashboardHeader }) {
  const { t } = useTranslation();
  const { organization, manager, scope, businessName, loading } = useAnalyticsScope();
  if (loading) return <PageSkeleton />;
  if (!organization) return <EmptyState icon={BarChart3} title={t('staff.analytics.chooseWorkspace')} />;
  return <Dashboard key={`${scope}-${organization}-${page}`} page={page} header={header} organization={organization} manager={manager} scope={scope} businessName={businessName} />;
}

interface DashboardProps {
  page: DashboardPage;
  header: DashboardHeader;
  organization: string;
  manager: boolean;
  scope: string;
  businessName: string;
}

function Dashboard({ page, header, organization, manager, scope, businessName }: DashboardProps) {
  const { t } = useTranslation();
  const dashboard = useDashboard(page, organization, manager);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const serialized = JSON.stringify(filters);
  const { data, error, isLoading, mutate } = useScopedReport(organization, dashboard.period, scope, serialized);
  const [panel, setPanel] = useState<'add' | 'guide' | null>(null);
  const report = data?.message;
  // Exports share the filters on screen.
  const exportUrl = `/api/method/appointment.scheduler.analytics.export_csv?organization=${encodeURIComponent(organization)}&period=${dashboard.period}&filters=${encodeURIComponent(serialized)}`;
  const scopeLabel = manager ? t('staff.analytics.scopeManager') : report?.role === 'Provider' ? t('staff.analytics.scopeProvider') : t('staff.analytics.scopeReception');
  const range = report ? `${scopeLabel} · ${report.start} - ${report.end} (${report.timezone?.replace(/_/g, ' ') || 'UTC'})` : scopeLabel;
  // A custom date range belongs to the old period; a new period starts from its own window.
  const onPeriod = (value: number) => {
    setFilters((current) => ({ ...current, start: undefined, end: undefined }));
    void dashboard.savePeriod(value);
  };

  const controls = (
    <DashboardControls
      editing={dashboard.editing}
      saving={dashboard.saving}
      period={dashboard.period}
      onPeriod={onPeriod}
      onGuide={() => setPanel('guide')}
      onCustomize={dashboard.startEditing}
      onAdd={() => setPanel('add')}
      onReset={dashboard.reset}
      onCancel={dashboard.cancel}
      onSave={() => void dashboard.save()}
    >
      <a data-qa="analytics-export" href={exportUrl} download className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-9' })} aria-label={`${t('staff.analytics.export')} (${dashboard.period})`}>
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">{t('staff.analytics.export')}</span>
      </a>
    </DashboardControls>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title ?? report?.business_name ?? businessName}
        description={header.description ?? range}
        headingQa={header.headingQa}
        className="pb-0"
        actions={<>{header.actions}{controls}</>}
      />
      {header.notice}
      {page === 'overview' && <AttentionNotice count={Number(report?.metrics?.attention?.value || 0)} />}
      <div data-qa="analytics-filters">
        <DashboardFilters filters={filters} onChange={setFilters} options={report?.filter_options || {}} label={t('staff.analytics.filters')} />
      </div>
      {dashboard.editing && <p className="rounded-lg border border-dashed border-primary/40 bg-accent/40 px-4 py-2 text-xs text-accent-foreground" role="status">{t('staff.dashboard.editingHint')}</p>}
      {isLoading && !report ? (
        <PageSkeleton />
      ) : error || !report ? (
        <ErrorState title={t('staff.analytics.unavailableTitle')} description={t('staff.analytics.unavailableDescription')} onRetry={() => void mutate()} />
      ) : (
        <DashboardGrid
          layout={dashboard.layout}
          editing={dashboard.editing}
          ctx={{ report, period: dashboard.period, organization, manager }}
          onLayoutChange={dashboard.setLayout}
          actionsFor={(id) => ({ onRemove: () => dashboard.remove(id), onWidth: (w) => dashboard.setWidth(id, w), onMove: (direction) => dashboard.move(id, direction) })}
        />
      )}
      <AddWidgetSheet open={panel === 'add'} onOpenChange={(open) => setPanel(open ? 'add' : null)} widgets={dashboard.allowed} placed={new Set(dashboard.layout.map((item) => item.i))} onAdd={dashboard.add} />
      <GuideSheet open={panel === 'guide'} onOpenChange={(open) => setPanel(open ? 'guide' : null)} page={page} layout={dashboard.layout} />
    </div>
  );
}

/** Past appointments still waiting for an outcome keep today's board inaccurate. */
function AttentionNotice({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <Alert data-qa="home-attention" variant="warning" className="flex flex-col gap-3 sm:flex-row sm:items-center [&>svg]:static [&>svg]:shrink-0 [&>svg~*]:pl-0">
      <AlertTriangle />
      <div>
        <AlertTitle>
          <span className="tabular-nums">{count}</span> {count === 1 ? t('staff.home.attention.one') : t('staff.home.attention.many')}
        </AlertTitle>
        <AlertDescription>{t('staff.home.attention.description')}</AlertDescription>
      </div>
      <Link to="/reception" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'shrink-0 sm:ml-auto' })}>
        {t('staff.home.attention.action')}
      </Link>
    </Alert>
  );
}
