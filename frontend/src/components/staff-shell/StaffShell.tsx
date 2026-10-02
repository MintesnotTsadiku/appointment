import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/sheet';
import { SidebarNav } from './SidebarNav';
import { CommandPalette } from './CommandPalette';
import { LanguageButton, ThemeButton } from './ShellControls';
import { UserMenu } from './UserMenu';
import { PageHeader, type Crumb } from './PageHeader';
import { useStaffSurface } from './useStaffSurface';

const COLLAPSE_KEY = 'staff-sidebar-collapsed';
const WIDTH = { default: 'max-w-6xl', wide: 'max-w-7xl', full: 'max-w-none' } as const;

export interface StaffShellProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  headingQa?: string;
  width?: keyof typeof WIDTH;
  /** Removes page padding for full-bleed tools such as the reception desk. */
  flush?: boolean;
  className?: string;
}

/** The signed-in staff frame: sidebar, top bar, command palette and page header. */
export function StaffShell({ children, title, description, eyebrow, actions, breadcrumbs, headingQa, width = 'wide', flush = false, className }: StaffShellProps) {
  useStaffSurface();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      writeCollapsed(!value);
      return !value;
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div data-qa="staff-shell" className="min-h-dvh bg-background text-foreground">
      <a
        href="#staff-main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('staff.shell.skip')}
      </a>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:block',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <SidebarNav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[85%] max-w-[300px] gap-0 p-0" aria-describedby={undefined} closeLabel={t('staff.shell.close')}>
          <SheetTitle className="sr-only">{t('staff.shell.primaryNav')}</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200 motion-reduce:transition-none', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <TopBar onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main id="staff-main" tabIndex={-1} className={cn('flex-1 outline-none', !flush && 'px-4 py-4 sm:px-6 lg:py-5')}>
          <div className={cn('mx-auto w-full', WIDTH[width], className)}>
            {title && <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} breadcrumbs={breadcrumbs} headingQa={headingQa} />}
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
    </MotionConfig>
  );
}

function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-1.5 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4 lg:px-6">
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={onMenu} aria-label={t('staff.shell.menu')} data-qa="shell-menu">
        <Menu />
      </Button>
      <button
        type="button"
        onClick={onSearch}
        data-qa="shell-search"
        className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring max-sm:w-9 max-sm:justify-center max-sm:px-0 sm:w-64"
        aria-label={t('staff.shell.search')}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden truncate sm:inline">{t('staff.shell.searchShort')}</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        <LanguageButton />
        <ThemeButton />
        <div className="lg:hidden">
          <UserMenu compact />
        </div>
      </div>
    </header>
  );
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    // Storage can be unavailable in private windows; the toggle still works.
  }
}
