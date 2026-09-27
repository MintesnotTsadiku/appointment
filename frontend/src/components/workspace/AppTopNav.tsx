import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Menu, BarChart3, Building2, CalendarDays, Home, Monitor, Moon, Settings, Sun, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useSession } from '@/context/session';
import { useTheme } from '@/components/theme-provider';
import { useNavigationPreference } from './useNavigationPreference';
import AccountMenu from './AccountMenu';
import './workspace-shell.css';

export function AppTopNav({ active }: { active?: 'home' | 'analytics' | 'reception' | 'calendar' | 'settings' | 'team' }) {
  const { session, selectWorkspace } = useSession();
  const { theme, setTheme, appearanceError, saving, isLoadingColors } = useTheme();
  const { value: preference, update, error } = useNavigationPreference();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const workspaceVisible = Boolean(session?.authenticated && ['workspace','administrator','individual_owner'].includes(session.state));
  useEffect(() => {
    if (!workspaceVisible) return;
    document.documentElement.dataset.workspaceNavigation = preference.placement;
    document.documentElement.dataset.workspaceCollapsed = String(preference.collapsed);
    return () => { delete document.documentElement.dataset.workspaceNavigation; delete document.documentElement.dataset.workspaceCollapsed; };
  }, [workspaceVisible, preference.placement, preference.collapsed]);
  useEffect(() => { setDrawer(false); }, [location.pathname]);
  if (!workspaceVisible || !session) return null;
  const selected = session.selected;
  const manager = Boolean(session.is_administrator || selected?.is_manager || session.state === 'individual_owner');
  const links = [
    { key: 'home', label: 'Overview', to: '/home', icon: Home, show: Boolean(selected) || manager },
    { key: 'analytics', label: 'Insights', to: '/analytics', icon: BarChart3, show: Boolean(selected) || manager },
    { key: 'reception', label: 'Reception', to: '/reception', icon: Users, show: manager || selected?.role === 'Receptionist' },
    { key: 'calendar', label: 'Schedule', to: '/calendar', icon: CalendarDays, show: Boolean(selected) || manager },
    { key: 'settings', label: 'Settings', to: '/settings', icon: Settings, show: true },
  ].filter(link=>link.show);
  const title = location.pathname === '/settings/profile' ? 'Your profile' : location.pathname === '/settings/appearance' ? 'Appearance' : links.find(link=>active === link.key)?.label || 'Workspace';
  const business = selected?.business_name || (session.state === 'individual_owner' ? 'Independent business' : 'Administration');
  const switchWorkspace = async (organization: string) => {
    if (organization === selected?.organization) return;
    const next = await selectWorkspace(organization);
    if (next?.selected?.landing) navigate(next.selected.landing);
  };
  const renderLinks = (iconsOnly = false) => links.map(link=>{
    const current = active === link.key || location.pathname.startsWith(link.to);
    return <Link key={link.key} className="workspace-link" to={link.to} aria-label={link.label} aria-current={current ? 'page' : undefined} title={iconsOnly ? link.label : undefined}>
      <link.icon size={18} aria-hidden="true"/>{!iconsOnly && link.label}
    </Link>;
  });
  return <>
    {preference.placement === 'sidebar' && <aside className="workspace-sidebar" data-collapsed={preference.collapsed}>
      <div className="workspace-rail">
        <Link to="/home" className="workspace-link" aria-label="Scheduler home" title="Scheduler"><CalendarDays size={21}/></Link>
        <nav aria-label={preference.collapsed ? "Sidebar navigation" : "Workspace shortcuts"}>{renderLinks(true)}</nav>
        <button type="button" className="workspace-link" aria-label={preference.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={preference.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={()=>void update({...preference,collapsed:!preference.collapsed})}>{preference.collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
        <div className="workspace-rail-bottom"><AccountMenu/></div>
      </div>
      <div className="workspace-panel">
        <div className="workspace-brand"><Link to="/home">Scheduler</Link><span aria-hidden="true">⌄</span></div>
        <p className="workspace-section-label">Workspace</p>
        <nav aria-label="Sidebar navigation">{renderLinks()}</nav>
        <div className="workspace-business"><strong>{business}</strong><small>{selected?.role || 'Personal workspace'}</small></div>
      </div>
    </aside>}
    <Dialog open={drawer} onOpenChange={setDrawer}><DialogContent side="left" className="p-6"><DialogTitle>Workspace navigation</DialogTitle><nav aria-label="Mobile navigation" className="mt-6 space-y-2">{renderLinks()}</nav><div className="mt-6"><AccountMenu/></div></DialogContent></Dialog>
    <header className="workspace-header" data-placement={preference.placement}>
      <div className="workspace-header-inner">
        <Button variant="ghost" size="icon" className="workspace-mobile-menu min-h-11 min-w-11" aria-label="Open navigation drawer" onClick={()=>setDrawer(true)}><Menu size={19}/></Button>
        <span className="workspace-page-title">{title}</span>
        <div className="workspace-header-business">
          <Building2 size={15} aria-hidden="true"/>
          {session.workspaces.length > 1 ? <Select value={selected?.organization} onValueChange={value=>void switchWorkspace(value)}>
            <SelectTrigger aria-label="Active business" data-qa="workspace-switcher" className="max-w-[240px] border-0 bg-transparent shadow-none"><SelectValue/></SelectTrigger>
            <SelectContent>{session.workspaces.map(workspace=><SelectItem key={workspace.organization} value={workspace.organization}>{workspace.business_name} · {workspace.role}</SelectItem>)}</SelectContent>
          </Select> : <span data-qa="active-business">{business}{selected && ` · ${selected.role}`}</span>}
        </div>
        {preference.placement === 'top' && <nav aria-label="Top navigation" className="workspace-top-links">{renderLinks()}</nav>}
        <div className="workspace-header-actions">
          {(error || appearanceError) && <Link role="alert" to="/settings/appearance" className="text-xs underline">Review preferences</Link>}
          <Button type="button" variant="ghost" size="icon" disabled={saving || isLoadingColors} onClick={()=>setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')} aria-label={`Theme: ${theme}. Switch theme`} data-qa="topnav-theme" title={`Theme: ${theme}`}>
            {theme === 'light' ? <Sun size={17}/> : theme === 'dark' ? <Moon size={17}/> : <Monitor size={17}/>}
          </Button>
          <div className="workspace-header-account"><AccountMenu/></div>
        </div>
      </div>
    </header>
  </>;
}
export default AppTopNav;
