import { Navigate } from 'react-router-dom';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { StaffShell } from '@/components/staff-shell';
import { ErrorState, PageSkeleton } from '@/components/states';
import { HomeToday } from './today/HomeToday';

/** Membership is the source of truth; an old provider wizard must not send an
 * established owner or manager back through personal onboarding. */
export default function Home() {
  const { session, loading, error, refresh } = useSession();
  const { t } = useTranslation();
  if (loading) return <StaffShell><PageSkeleton /></StaffShell>;
  if (error) return <StaffShell width="default"><ErrorState title={t('staff.home.loadError')} onRetry={refresh} /></StaffShell>;
  if (!session?.authenticated || session.state === 'disabled') return <Navigate to="/login" replace />;
  if (session.landing.split('?')[0] !== '/home') return <Navigate to={session.landing} replace />;
  return <HomeToday session={session} />;
}
