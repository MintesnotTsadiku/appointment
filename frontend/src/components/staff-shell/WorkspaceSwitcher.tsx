import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useSession, type Workspace } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { useSidebar } from '@/components/sidebar';

export function useRoleLabel() {
  const { t } = useTranslation();
  return (role?: string | null) => {
    if (!role) return t('staff.roles.administrator');
    const key = `staff.roles.${role}`;
    const label = t(key);
    return label === key ? role : label;
  };
}

/** Shows the active business; multi-business users get a switcher. */
export function WorkspaceSwitcher() {
  const { session, selectWorkspace } = useSession();
  const { collapsed } = useSidebar();
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const navigate = useNavigate();
  if (!session) return null;
  const selected = session.selected;
  const name = selected?.business_name ?? t('staff.nav.admin');
  const multiple = session.workspaces.length > 1;

  const onSwitch = async (workspace: Workspace) => {
    if (workspace.organization === selected?.organization) return;
    try {
      const next = await selectWorkspace(workspace.organization);
      const target = next?.selected?.landing;
      if (target) navigate(target);
      toast.success(`${t('staff.shell.switchedTo')} ${workspace.business_name}`);
    } catch {
      toast.error(t('staff.shell.switchFailed'));
    }
  };

  const summary = (
    <>
      <BusinessMark name={name} logo={selected?.logo} />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
          <span data-qa="active-business" className="truncate text-sm font-semibold text-foreground" title={name}>{name}</span>
          <span className="truncate text-xs text-muted-foreground">{roleLabel(selected?.role)}</span>
        </span>
      )}
    </>
  );

  if (!multiple) {
    return <div className={cn('flex items-center gap-2.5 rounded-lg p-1.5', collapsed && 'justify-center')} title={collapsed ? name : undefined}>{summary}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-qa="workspace-switcher"
        aria-label={`${t('staff.shell.switchBusiness')}: ${name}`}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg border border-transparent p-1.5 text-left outline-none transition-colors hover:border-border hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring',
          collapsed && 'justify-center'
        )}
      >
        {summary}
        {!collapsed && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t('staff.shell.switchBusiness')}</DropdownMenuLabel>
        {session.workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.organization} onSelect={() => void onSwitch(workspace)} data-qa="workspace-option" className="gap-2.5 py-2">
            <BusinessMark name={workspace.business_name} logo={workspace.logo} small />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{workspace.business_name}</span>
              <span className="truncate text-xs text-muted-foreground">{roleLabel(workspace.role)}</span>
            </span>
            {workspace.organization === selected?.organization && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/workspaces')}>
          <LayoutGrid />
          {t('staff.nav.workspaces')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BusinessMark({ name, logo, small = false }: { name: string; logo?: string | null; small?: boolean }) {
  const [broken, setBroken] = useState(false);
  const size = small ? 'h-7 w-7' : 'h-9 w-9';
  if (logo && !broken) {
    return (
      <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card', size)}>
        <img src={logo} alt="" className="h-full w-full object-contain p-0.5" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground', size, small ? 'text-[11px]' : 'text-xs')}
    >
      {initials(name) || '•'}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}
