import { Link } from 'react-router-dom';
import { EyeOff, ExternalLink, LayoutGrid, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import WorkspaceDashboard from '@/components/analytics/WorkspaceDashboard';
import { StaffShell, useRoleLabel } from '@/components/staff-shell';
import { isAllowedDestination, type SessionState } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';

/** Role-aware "today" overview for owners, managers and administrators. */
export function HomeToday({ session }: { session: SessionState }) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const business = session.selected;
  const admin = session.state === 'administrator';
  const today = format(new Date(), 'EEEE, d MMMM');
  const description = admin
    ? t('staff.home.adminDescription')
    : `${[roleLabel(business?.role), today].filter(Boolean).join(' · ')}${business?.timezone ? ` (${business.timezone.replace(/_/g, ' ')})` : ''}`;

  if (admin || !business) {
    return (
      <StaffShell title={t('staff.nav.admin')} headingQa="business-overview-heading" description={description}>
        <div data-qa="app-shell">
          <AdminPanel session={session} />
        </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell>
      <div data-qa="app-shell">
        <WorkspaceDashboard
          page="overview"
          header={{
            title: business.business_name,
            headingQa: 'business-overview-heading',
            description,
            actions: isAllowedDestination('/reception', session) ? (
              <Button asChild size="sm" className="h-9" data-qa="home-new-appointment">
                <Link to="/reception">{t('staff.home.openDesk')}</Link>
              </Button>
            ) : undefined,
            notice: !business.published ? <DraftNotice /> : undefined,
          }}
        />
      </div>
    </StaffShell>
  );
}

function DraftNotice() {
  const { t } = useTranslation();
  return (
    <Alert data-qa="business-draft-next-step" variant="warning" className="flex flex-col gap-3 sm:flex-row sm:items-center [&>svg]:static [&>svg]:shrink-0 [&>svg~*]:pl-0">
      <EyeOff />
      <div>
        <AlertTitle>{t('staff.home.draftTitle')}</AlertTitle>
        <AlertDescription>{t('staff.home.draftDescription')}</AlertDescription>
      </div>
      <Button asChild size="sm" className="shrink-0 sm:ml-auto">
        <Link to="/settings/business">{t('staff.home.reviewPublish')}</Link>
      </Button>
    </Alert>
  );
}

function AdminPanel({ session }: { session: SessionState }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="shadow-card">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">{t('staff.home.adminSystemTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('staff.home.adminSystemHint')}</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button asChild>
              <a href="/app">
                {t('staff.shell.desk')}
                <ExternalLink />
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/dashboard">{t('staff.home.adminDashboard')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {session.workspaces.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="flex h-full flex-col gap-3 p-5">
            <LayoutGrid className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold">{t('staff.nav.workspaces')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('staff.home.adminWorkspacesHint')}</p>
            </div>
            <Button asChild variant="outline" className="mt-auto self-start">
              <Link to="/workspaces">{t('staff.nav.workspaces')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
