import { Navigate } from 'react-router-dom';
import AppTopNav from '@/components/workspace/AppTopNav';
import WorkspaceDashboard from '@/components/analytics/WorkspaceDashboard';
import { useSession } from '@/context/session';
import Spinner from '@/components/spinner';

export default function Analytics() {
  const { session, loading } = useSession();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  if (!session.selected) return <Navigate to={session.landing} replace />;
  return <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}><AppTopNav active="analytics" /><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><WorkspaceDashboard /></div></main>;
}
