import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { Building2, CalendarDays, Home, LogOut, Monitor, Moon, Settings, Sun, Users } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/button';

const ROLE_LABEL: Record<string, string> = {
  Owner: 'Owner',
  Manager: 'Manager',
  Receptionist: 'Receptionist',
  Provider: 'Provider',
};

export function AppTopNav({ active }: { active?: 'home' | 'reception' | 'calendar' | 'settings' | 'team' }) {
  const { session, selectWorkspace } = useSession();
  const { logout } = useFrappeAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (!session?.authenticated || (session.state !== 'workspace' && session.state !== 'administrator')) {
    return null;
  }

  const selected = session.selected;
  const isManager = Boolean(session.is_administrator || selected?.is_manager);
  const isReceptionist = selected?.role === 'Receptionist';

  const links: Array<{ key: string; label: string; to: string; icon: typeof Home; show: boolean }> = [
    { key: 'home', label: 'Overview', to: '/home', icon: Home, show: isManager },
    { key: 'reception', label: 'Reception', to: '/reception', icon: Users, show: isManager || isReceptionist },
    { key: 'calendar', label: 'Schedule', to: '/calendar', icon: CalendarDays, show: !isManager },
    { key: 'settings', label: 'Settings', to: '/settings', icon: Settings, show: isManager },
  ];

  const cycleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };

  const onSwitch = async (organization: string) => {
    if (!organization || organization === selected?.organization) return;
    const next = await selectWorkspace(organization);
    const target = next?.selected?.landing;
    if (target) navigate(target);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/home" className="flex items-center gap-2 font-heading text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary">
            <CalendarDays className="h-4 w-4 text-white" />
          </span>
          <span className="hidden sm:inline">Scheduler</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          {session.workspaces.length > 1 ? (
            <label className="sr-only" htmlFor="workspace-switcher">
              Active business
            </label>
          ) : null}
          {session.workspaces.length > 1 ? (
            <select
              id="workspace-switcher"
              data-qa="workspace-switcher"
              value={selected?.organization ?? ''}
              onChange={(event) => void onSwitch(event.target.value)}
              className="max-w-[220px] truncate rounded-lg border px-2 py-1 text-sm"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {session.workspaces.map((workspace) => (
                <option key={workspace.organization} value={workspace.organization}>
                  {workspace.business_name} · {ROLE_LABEL[workspace.role] ?? workspace.role}
                </option>
              ))}
            </select>
          ) : (
            <span data-qa="active-business" className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selected?.business_name ?? 'Administration'}
              {selected ? <span style={{ color: 'var(--text-muted)' }}> · {ROLE_LABEL[selected.role] ?? selected.role}</span> : null}
            </span>
          )}
        </div>

        <nav className="order-last flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {links
            .filter((link) => link.show)
            .map((link) => {
              const isActive = active === link.key || location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.key}
                  to={link.to}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            aria-label={`Theme: ${theme}. Switch theme`}
            data-qa="topnav-theme"
            title={`Theme: ${theme}`}
          >
            {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => void handleLogout()} aria-label="Sign out" data-qa="topnav-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AppTopNav;
