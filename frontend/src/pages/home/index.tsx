import { Link, Navigate } from 'react-router-dom';
import { CalendarPlus, Globe, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { StaffShell } from '@/components/staff-shell';
import { ErrorState, PageSkeleton } from '@/components/states';
import ConfigurableDashboard from '@/components/analytics/ConfigurableDashboard';
import { useAnalyticsScope } from '@/components/analytics/WorkspaceDashboard';
import { HomeToday } from './today/HomeToday';

/** Membership is the source of truth; an old provider wizard must not send an
 * established owner or manager back through personal onboarding. */
export default function Home() {
  const { session, loading, error, refresh } = useSession();
  const { t } = useTranslation();
  if (loading) return <StaffShell><PageSkeleton /></StaffShell>;
  if (error) return <StaffShell width="default"><ErrorState title={t('staff.home.loadError')} onRetry={refresh} /></StaffShell>;
  if (!session?.authenticated || session.state === 'disabled') return <Navigate to="/login" replace />;
  if (session.state === 'individual_owner') return <IndependentHome />;
  if (session.landing.split('?')[0] !== '/home') return <Navigate to={session.landing} replace />;
  return <HomeToday session={session} />;
}

/**
 * An independent provider has no business membership, so the desk-backed
 * overview widgets do not apply. Their home is the analytics home for the
 * `Provider:<name>` reporting scope.
 */
function IndependentHome() {
  const { t } = useTranslation();
  const { provider } = useAnalyticsScope();
  return (
    <StaffShell
      title={provider || t('staff.home.independentBusiness')}
      headingQa="business-overview-heading"
      description={`${t('staff.home.independentBusiness')} · ${format(new Date(), 'EEEE, d MMMM')}`}
    >
      <div data-qa="app-shell">
        <ConfigurableDashboard embedded quickActions={<IndependentActions />} />
      </div>
    </StaffShell>
  );
}

const INDEPENDENT_ACTIONS = [
  { key: 'reception', to: '/reception', icon: CalendarPlus, titleKey: 'staff.home.actions.reception', descriptionKey: 'staff.home.actions.receptionHint' },
  { key: 'independent-booking', to: '/settings/independent-booking', icon: Link2, titleKey: 'staff.home.actions.independentBooking', descriptionKey: 'staff.home.actions.independentBookingHint' },
  { key: 'site', to: '/settings/website', icon: Globe, titleKey: 'staff.home.actions.site', descriptionKey: 'staff.home.actions.siteHint' },
];

/** Shortcuts an independent provider may open; team and business settings do not apply. */
function IndependentActions() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('staff.home.actions.title')} className="rounded-xl border bg-card p-3 shadow-card">
      <h2 className="px-2 pb-1 text-sm font-semibold">{t('staff.home.actions.title')}</h2>
      <ul>
        {INDEPENDENT_ACTIONS.map(({ key, to, icon: Icon, titleKey, descriptionKey }) => (
          <li key={key}>
            <Link
              to={to}
              data-qa={`home-action-${key}`}
              className="flex items-start gap-3 rounded-md px-2 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{t(titleKey)}</span>
                <span className="block text-xs text-muted-foreground">{t(descriptionKey)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
