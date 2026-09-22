import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Globe, MapPin, ShieldCheck } from 'lucide-react';
import { useSession } from '@/context/session';
import { Button } from '@/components/button';
import { useTheme } from '@/components/theme-provider';

const ROLE_LABEL: Record<string, string> = {
  Owner: 'Owner',
  Manager: 'Manager',
  Receptionist: 'Receptionist',
  Provider: 'Provider',
};

export default function Workspaces() {
  const { session, loading, selectWorkspace } = useSession();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session) return;
    if (!session.authenticated) {
      window.location.href = '/login?redirect-to=%2Fworkspaces';
      return;
    }
    if (session.state !== 'selection' && session.state !== 'workspace') {
      navigate(session.landing, { replace: true });
    } else if (session.state === 'workspace' && session.workspaces.length === 1) {
      navigate(session.landing, { replace: true });
    }
  }, [loading, session, navigate]);

  const open = async (organization: string, landing: string) => {
    const next = await selectWorkspace(organization);
    navigate(next?.selected?.landing ?? landing);
  };

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p role="status" style={{ color: 'var(--text-secondary)' }}>
          Loading your businesses…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 data-qa="workspaces-heading" className="font-heading text-3xl font-bold">
              Choose a business
            </h1>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              You belong to {session.workspaces.length} businesses. Your access is scoped to each one.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
            Theme
          </Button>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2" data-qa="workspace-list">
          {session.workspaces.map((workspace) => (
            <li
              key={workspace.organization}
              data-qa="workspace-card"
              className="flex flex-col gap-3 rounded-2xl border p-5"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
                  <Building2 className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{workspace.business_name}</h2>
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent-primary)' }}>
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_LABEL[workspace.role] ?? workspace.role}
                  </span>
                </div>
              </div>
              <dl className="space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{workspace.location_names.length ? workspace.location_names.join(', ') : 'All locations'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{workspace.timezone ?? 'Africa/Addis Ababa'}</span>
                </div>
              </dl>
              <Button className="mt-auto w-fit" onClick={() => void open(workspace.organization, workspace.landing)}>
                Open <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
