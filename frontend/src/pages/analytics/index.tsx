import { Navigate } from 'react-router-dom';
import WorkspaceDashboard from '@/components/analytics/WorkspaceDashboard';
import { StaffShell } from '@/components/staff-shell';
import { PageSkeleton } from '@/components/states';
import { useSession } from '@/context/session';
import YearReviewPromo from '@/pages/grow/YearReviewPromo';

export default function Analytics() {
  const { session, loading } = useSession();
  if (loading) return <StaffShell><PageSkeleton /></StaffShell>;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  if (!session.selected && session.state !== 'individual_owner') return <Navigate to={session.landing} replace />;
  return (
    <StaffShell>
      <WorkspaceDashboard page="insights" header={{ notice: <YearReviewPromo /> }} />
    </StaffShell>
  );
}
