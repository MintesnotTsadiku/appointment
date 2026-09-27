import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/dialog';
import { useNavigationPreference } from './useNavigationPreference';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { PanelLeftClose, PanelLeftOpen, Menu, BarChart3, Building2, CalendarDays, Home, LogOut, Monitor, Moon, Settings, Sun, Users } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';

const ROLE_LABEL: Record<string, string> = {
  Owner: 'Owner',
  Manager: 'Manager',
  Receptionist: 'Receptionist',
  Provider: 'Provider',
};

export function AppTopNav({ active }: { active?: 'home' | 'analytics' | 'reception' | 'calendar' | 'settings' | 'team' }) {
  const { session, selectWorkspace } = useSession();
  const { logout } = useFrappeAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { value: preference, update: updatePreference } = useNavigationPreference();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.workspaceNavigation = preference.placement;
    document.documentElement.dataset.workspaceCollapsed = String(preference.collapsed);
    return () => { delete document.documentElement.dataset.workspaceNavigation; delete document.documentElement.dataset.workspaceCollapsed; };
  }, [preference.placement, preference.collapsed]);
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  if (!session?.authenticated || (session.state !== 'workspace' && session.state !== 'administrator' && session.state !== 'individual_owner')) {
    return null;
  }

  const selected = session.selected;
  const independent = session.state === 'individual_owner';
  const isManager = Boolean(session.is_administrator || selected?.is_manager || independent);
  const isReceptionist = selected?.role === 'Receptionist';

  const links: Array<{ key: string; label: string; to: string; icon: typeof Home; show: boolean }> = [
    { key: 'home', label: 'Overview', to: '/home', icon: Home, show: Boolean(selected) || isManager },
    { key: 'analytics', label: 'Insights', to: '/analytics', icon: BarChart3, show: Boolean(selected) || independent },
    { key: 'reception', label: 'Reception', to: '/reception', icon: Users, show: isManager || isReceptionist },
    { key: 'calendar', label: 'Schedule', to: '/calendar', icon: CalendarDays, show: Boolean(selected) || independent },
    { key: 'settings', label: 'Settings', to: independent ? '/settings/independent-booking' : '/settings', icon: Settings, show: isManager },
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

  const renderLinks = (iconsOnly = false) => links.filter(link => link.show).map(link => {
    const selectedRoute = active === link.key || location.pathname.startsWith(link.to);
    return <Link key={link.key} to={link.to} aria-label={link.label} aria-current={selectedRoute ? 'page' : undefined}
      title={iconsOnly ? link.label : undefined} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm"
      style={{ background: selectedRoute ? 'var(--accent-primary-light)' : undefined, color: selectedRoute ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
      <link.icon size={19} aria-hidden="true" />{!iconsOnly && link.label}
    </Link>;
  });
  return (<>
    {preference.placement === 'sidebar' && <aside className="workspace-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r p-4 md:flex" style={{width:preference.collapsed?80:240, background:'var(--bg-elevated)',borderColor:'var(--border-default)'}}>
      <Link to="/home" aria-label="Scheduler home" className="mb-8 flex items-center gap-3 px-2 font-heading font-semibold"><CalendarDays size={22} style={{color:'var(--accent-primary)'}}/>{!preference.collapsed && 'Scheduler'}</Link>
      <nav aria-label="Sidebar navigation" className="space-y-2">{renderLinks(preference.collapsed)}</nav>
      <Button className="mt-auto" variant="ghost" aria-label={preference.collapsed?'Expand sidebar':'Collapse sidebar'} title={preference.collapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>void updatePreference({...preference,collapsed:!preference.collapsed})}>{preference.collapsed?<PanelLeftOpen size={20}/>:<><PanelLeftClose size={20}/><span className="ml-2">Collapse</span></>}</Button>
    </aside>}
    <Dialog open={drawer} onOpenChange={setDrawer}><DialogContent side="right" className="p-6"><DialogTitle>Workspace navigation</DialogTitle><nav aria-label="Mobile navigation" className="mt-6 space-y-2">{renderLinks()}</nav></DialogContent></Dialog>
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11 md:hidden" aria-label="Open navigation drawer" onClick={()=>setDrawer(true)}><Menu size={20}/></Button>
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
            <Select value={selected?.organization} onValueChange={value => void onSwitch(value)}>
              <SelectTrigger id="workspace-switcher" data-qa="workspace-switcher" className="h-8 max-w-[220px] border-0 bg-transparent px-2 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {session.workspaces.map((workspace) => (
                  <SelectItem key={workspace.organization} value={workspace.organization}>
                    {workspace.business_name} · {ROLE_LABEL[workspace.role] ?? workspace.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span data-qa="active-business" className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selected?.business_name ?? (independent ? 'Independent business' : 'Administration')}
              {selected ? <span style={{ color: 'var(--text-muted)' }}> · {ROLE_LABEL[selected.role] ?? selected.role}</span> : null}
            </span>
          )}
        </div>

        <nav aria-label="Top navigation" className={`order-last hidden w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1 ${preference.placement === 'sidebar' ? '' : 'md:flex'}`}>
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
          <Select value={preference.placement} onValueChange={value => void updatePreference({ ...preference, placement: value as 'top' | 'sidebar' })}>
            <SelectTrigger id="navigation-placement" aria-label="Navigation placement" className="h-8 w-[9.75rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top navigation</SelectItem>
              <SelectItem value="sidebar">Left sidebar</SelectItem>
            </SelectContent>
          </Select>
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
  </>);
}

export default AppTopNav;
