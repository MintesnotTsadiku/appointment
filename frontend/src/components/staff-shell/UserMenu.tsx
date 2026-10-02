import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { ExternalLink, LayoutGrid, LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import { useSession, isAllowedDestination } from '@/context/session';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { useSidebar } from '@/components/sidebar';

export function initialsOf(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Account actions; `compact` renders only the avatar (mobile top bar). */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { session } = useSession();
  const { logout } = useFrappeAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  if (!session) return null;
  const name = session.full_name || session.user;
  const iconOnly = compact || collapsed;

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-qa={compact ? 'user-menu-compact' : 'user-menu'}
        aria-label={`${t('staff.shell.account')}: ${name}`}
        className={cn(
          'flex items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring',
          !iconOnly && 'w-full',
          iconOnly && 'justify-center'
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">{initialsOf(name)}</AvatarFallback>
        </Avatar>
        {!iconOnly && (
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{session.user}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block truncate text-xs">{session.user}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAllowedDestination('/settings/profile', session) && (
          <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
            <User />
            {t('staff.shell.profile')}
          </DropdownMenuItem>
        )}
        {session.workspaces.length > 1 && (
          <DropdownMenuItem onSelect={() => navigate('/workspaces')}>
            <LayoutGrid />
            {t('staff.nav.workspaces')}
          </DropdownMenuItem>
        )}
        {session.is_administrator && (
          <DropdownMenuItem asChild>
            <a href="/app">
              <ExternalLink />
              {t('staff.shell.desk')}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('staff.shell.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
          <DropdownMenuRadioItem value="light"><Sun />{t('staff.shell.themeLight')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon />{t('staff.shell.themeDark')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor />{t('staff.shell.themeSystem')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} data-qa="topnav-logout" className="text-destructive focus:text-destructive">
          <LogOut />
          {t('staff.shell.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
