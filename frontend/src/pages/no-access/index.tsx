import { useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CalendarClock, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/button';
import { useSession } from '@/context/session';

export default function NoAccess() {
  const { session } = useSession();
  const { logout } = useFrappeAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-lg rounded-2xl border p-8 text-center"
        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
      >
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--accent-warning-light, var(--border-subtle))' }}>
          <ShieldAlert className="h-7 w-7" style={{ color: 'var(--status-pending, #d97706)' }} />
        </span>
        <h1 data-qa="no-access-heading" className="font-heading text-2xl font-bold">
          No business assigned yet
        </h1>
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
          {session?.full_name ? `${session.full_name}, your` : 'Your'} account can sign in, but no manager has assigned it to a
          business. Ask a business owner or manager to assign you a role and scope.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          This is not a business-setup screen. Creating a business is only for new owners.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => void handleLogout()}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
          <Button asChild>
            <Link to="/">
              <CalendarClock className="mr-1 h-4 w-4" /> Browse booking pages
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
