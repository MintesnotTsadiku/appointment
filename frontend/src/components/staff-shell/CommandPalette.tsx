import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import { Building2, Languages, LogOut, Moon, Search, Sun } from 'lucide-react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useSession } from '@/context/session';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogTitle } from '@/components/dialog';
import { primaryNav, settingsNav } from './navigation';
import { useRoleLabel } from './WorkspaceSwitcher';

/** Global ⌘K / Ctrl+K palette for navigation, workspace switching and preferences. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session, selectWorkspace } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const { t, language, languages, setLanguage } = useTranslation();
  const { logout } = useFrappeAuth();
  const roleLabel = useRoleLabel();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const run = (action: () => void | Promise<unknown>) => {
    onOpenChange(false);
    void action();
  };
  const nextLanguage = (() => {
    const available = languages.length ? languages : ['en', 'am'];
    return available[(available.indexOf(language) + 1) % available.length];
  })();
  const others = session?.workspaces.filter((w) => w.organization !== session.selected?.organization) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="top-[20%] max-w-[calc(100%-2rem)] translate-y-0 overflow-hidden rounded-xl p-0 sm:max-w-lg [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{t('staff.shell.search')}</DialogTitle>
        <CommandPrimitive
          data-qa="command-palette"
          className="flex h-full w-full flex-col text-popover-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <CommandPrimitive.Input
              autoFocus
              placeholder={t('staff.shell.search')}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandPrimitive.List className="max-h-[min(60vh,380px)] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="py-8 text-center text-sm text-muted-foreground">{t('staff.shell.noResults')}</CommandPrimitive.Empty>
            <PaletteGroup heading={t('staff.shell.navigate')}>
              {primaryNav(session).map((item) => (
                <PaletteItem key={item.key} value={`${t(item.labelKey)} ${item.to}`} onSelect={() => run(() => navigate(item.to))}>
                  <item.icon />
                  {t(item.labelKey)}
                </PaletteItem>
              ))}
            </PaletteGroup>
            {settingsNav(session).map((group) => (
              <PaletteGroup key={group.key} heading={`${t('staff.nav.settings')} · ${t(group.labelKey)}`}>
                {group.items.map((item) => (
                  <PaletteItem key={item.key} value={`${t(item.labelKey)} ${item.to}`} onSelect={() => run(() => navigate(item.to))}>
                    <item.icon />
                    {t(item.labelKey)}
                  </PaletteItem>
                ))}
              </PaletteGroup>
            ))}
            {others.length > 0 && (
              <PaletteGroup heading={t('staff.shell.switchBusiness')}>
                {others.map((workspace) => (
                  <PaletteItem
                    key={workspace.organization}
                    value={`${workspace.business_name} ${workspace.role}`}
                    onSelect={() =>
                      run(async () => {
                        const next = await selectWorkspace(workspace.organization);
                        if (next?.selected?.landing) navigate(next.selected.landing);
                      })
                    }
                  >
                    <Building2 />
                    <span className="flex-1 truncate">{workspace.business_name}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel(workspace.role)}</span>
                  </PaletteItem>
                ))}
              </PaletteGroup>
            )}
            <PaletteGroup heading={t('staff.shell.preferences')}>
              <PaletteItem value="theme" onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
                {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                {resolvedTheme === 'dark' ? t('staff.shell.themeLight') : t('staff.shell.themeDark')}
              </PaletteItem>
              <PaletteItem value="language" onSelect={() => run(() => setLanguage(nextLanguage))}>
                <Languages />
                {t('staff.shell.language')}
              </PaletteItem>
              <PaletteItem
                value="sign out"
                onSelect={() =>
                  run(async () => {
                    await logout();
                    navigate('/login', { replace: true });
                  })
                }
              >
                <LogOut />
                {t('staff.shell.signOut')}
              </PaletteItem>
            </PaletteGroup>
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

function PaletteGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return <CommandPrimitive.Group heading={heading}>{children}</CommandPrimitive.Group>;
}

function PaletteItem({ value, onSelect, children }: { value: string; onSelect: () => void; children: React.ReactNode }) {
  return (
    <CommandPrimitive.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-default select-none items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
    >
      {children}
    </CommandPrimitive.Item>
  );
}
