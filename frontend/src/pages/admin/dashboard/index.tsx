import { useFrappeGetCall } from 'frappe-react-sdk';
import { Link } from 'react-router-dom';
import { ExternalLink, RotateCw, ShieldAlert } from 'lucide-react';
import { StaffShell } from '@/components/staff-shell';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { Button } from '@/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { normalizeStats, type AdminStats } from './types';
import { OverviewKpis } from './OverviewKpis';
import { StatusPanel } from './StatusPanel';
import { TopProvidersPanel } from './TopProvidersPanel';
import { ActivityTable } from './ActivityTable';
import { DeskLinks } from './DeskLinks';

/** Platform-wide figures for System Managers; the endpoint enforces the role. */
export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error, mutate, isValidating } = useFrappeGetCall<{ message: AdminStats }>(
    'appointment.dashboard.admin_stats',
    undefined,
    'admin-dashboard-stats',
    { revalidateOnFocus: true }
  );

  const refresh = (
    <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
      <RotateCw className="h-4 w-4" aria-hidden="true" />
      {t('staff.admin.refresh')}
    </Button>
  );

  return (
    <StaffShell
      eyebrow={t('staff.nav.admin')}
      title={t('staff.admin.title')}
      description={t('staff.admin.description')}
      actions={error ? undefined : refresh}
      headingQa="admin-dashboard-heading"
    >
      <DashboardBody stats={data?.message} loading={isLoading} error={error} onRetry={() => void mutate()} />
    </StaffShell>
  );
}

function DashboardBody({ stats, loading, error, onRetry }: { stats?: AdminStats; loading: boolean; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  if (loading) return <PageSkeleton />;
  if (error) return isPermissionError(error) ? <AccessDenied /> : <ErrorState onRetry={onRetry} />;
  if (!stats) return <EmptyState title={t('staff.admin.emptyTitle')} description={t('staff.admin.emptyDescription')} />;

  const safe = normalizeStats(stats);
  return (
    <div className="space-y-6" data-qa="admin-dashboard">
      <OverviewKpis stats={safe} />
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('staff.admin.tabOverview')}</TabsTrigger>
          <TabsTrigger value="activity">{t('staff.admin.tabActivity')}</TabsTrigger>
          <TabsTrigger value="desk">{t('staff.admin.tabDesk')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusPanel breakdown={safe.appointments.status_breakdown} />
            <TopProvidersPanel providers={safe.top_providers} />
          </div>
        </TabsContent>
        <TabsContent value="activity" className="mt-0">
          <ActivityTable rows={safe.recent_activity} />
        </TabsContent>
        <TabsContent value="desk" className="mt-0">
          <DeskLinks />
        </TabsContent>
      </Tabs>
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
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size="sm">
            <Link to="/home">{t('staff.admin.backHome')}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/app">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t('staff.shell.desk')}
            </a>
          </Button>
        </div>
      }
    />
  );
}

function isPermissionError(error: unknown) {
  const value = error as { httpStatus?: number; exc_type?: string } | null;
  return value?.httpStatus === 403 || value?.exc_type === 'PermissionError';
}
