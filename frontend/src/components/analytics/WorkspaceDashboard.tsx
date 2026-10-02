import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Download } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { buttonVariants } from '@/components/button';
import { PageHeader } from '@/components/staff-shell';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardControls } from '@/components/dashboard/DashboardControls';
import { AddWidgetSheet } from '@/components/dashboard/AddWidgetSheet';
import { GuideSheet } from '@/components/dashboard/GuideSheet';
import { useDashboard } from '@/components/dashboard/useDashboard';
import type { DashboardPage } from '@/components/dashboard/types';
import { useReport } from './useReport';

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

/** Compact metrics strip for the provider schedule and reception desk. */
export function InsightBrief({ kind }: { kind: 'provider' | 'reception' }) {
  const { session } = useSession();
  const { t } = useTranslation();
  const organization = session?.selected?.organization;
  const { data, error } = useReport(organization, 7);
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
  const { session } = useSession();
  const { t } = useTranslation();
  const organization = session?.selected?.organization;
  if (!organization) return <EmptyState icon={BarChart3} title={t('staff.analytics.chooseWorkspace')} />;
  const manager = session?.selected?.role === 'Owner' || session?.selected?.role === 'Manager';
  return <Dashboard page={page} header={header} organization={organization} manager={manager} businessName={session?.selected?.business_name ?? ''} />;
}

interface DashboardProps {
  page: DashboardPage;
  header: DashboardHeader;
  organization: string;
  manager: boolean;
  businessName: string;
}

function Dashboard({ page, header, organization, manager, businessName }: DashboardProps) {
  const { t } = useTranslation();
  const dashboard = useDashboard(page, organization, manager);
  const { data, error, isLoading, mutate } = useReport(organization, dashboard.period);
  const [panel, setPanel] = useState<'add' | 'guide' | null>(null);
  const report = data?.message;
  const exportUrl = `/api/method/appointment.scheduler.analytics.export_csv?organization=${encodeURIComponent(organization)}&period=${dashboard.period}`;
  const scope = manager ? t('staff.analytics.scopeManager') : report?.role === 'Provider' ? t('staff.analytics.scopeProvider') : t('staff.analytics.scopeReception');
  const range = report ? `${scope} · ${report.start} - ${report.end} (${report.timezone?.replace(/_/g, ' ') || 'UTC'})` : scope;

  const controls = (
    <DashboardControls
      editing={dashboard.editing}
      saving={dashboard.saving}
      period={dashboard.period}
      onPeriod={(value) => void dashboard.savePeriod(value)}
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
