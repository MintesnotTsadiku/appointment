import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/sidebar';
import { isActivePath, primaryNav, settingsNav } from './navigation';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserMenu } from './UserMenu';

interface SidebarNavProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  className?: string;
}

/** Shared by the desktop rail and the mobile sheet. */
export function SidebarNav({ collapsed = false, onToggleCollapsed, onNavigate, className }: SidebarNavProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const items = primaryNav(session);
  const inSettings = isActivePath(pathname, '/settings');
  const settingsGroups = inSettings && !collapsed ? settingsNav(session) : [];

  return (
    <Sidebar collapsed={collapsed} className={className} aria-label={t('staff.shell.primaryNav')}>
      <SidebarHeader className="border-b pb-3">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={t('staff.shell.primaryNav')}>
          <SidebarGroup>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActivePath(pathname, item.to)} tooltip={t(item.labelKey)}>
                    <Link
                      to={item.to}
                      data-qa={item.qa}
                      aria-current={isActivePath(pathname, item.to) ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      <item.icon aria-hidden="true" />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {settingsGroups.map((group) => (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActivePath(pathname, item.to)} className="h-8 text-[13px]">
                      <Link to={item.to} data-qa={item.qa} aria-current={isActivePath(pathname, item.to) ? 'page' : undefined} onClick={onNavigate}>
                        <item.icon aria-hidden="true" className="!size-4" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        {onToggleCollapsed && (
          <SidebarMenuButton
            type="button"
            onClick={onToggleCollapsed}
            tooltip={t('staff.shell.expand')}
            aria-label={collapsed ? t('staff.shell.expand') : t('staff.shell.collapse')}
            aria-expanded={!collapsed}
            data-qa="sidebar-collapse"
            className="text-muted-foreground"
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
            {!collapsed && <span>{t('staff.shell.collapse')}</span>}
          </SidebarMenuButton>
        )}
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
