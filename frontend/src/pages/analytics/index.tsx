import { Navigate } from 'react-router-dom';
import WorkspaceDashboard from '@/components/analytics/WorkspaceDashboard';
import { StaffShell } from '@/components/staff-shell';
import { PageSkeleton } from '@/components/states';
import { useSession } from '@/context/session';

export default function Analytics() {
  const { session, loading } = useSession();
  if (loading) return <StaffShell><PageSkeleton /></StaffShell>;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  if (!session.selected) return <Navigate to={session.landing} replace />;
  return (
    <StaffShell>
      <WorkspaceDashboard page="insights" />
    </StaffShell>
  );
}
