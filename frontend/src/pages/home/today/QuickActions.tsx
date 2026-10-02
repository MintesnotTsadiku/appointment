import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Building2, CalendarPlus, Globe, Users } from 'lucide-react';
import { isAllowedDestination, useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';

interface Action {
  key: string;
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
}

const ACTIONS: Action[] = [
  { key: 'reception', to: '/reception', icon: CalendarPlus, titleKey: 'staff.home.actions.reception', descriptionKey: 'staff.home.actions.receptionHint' },
  { key: 'business', to: '/settings/business', icon: Building2, titleKey: 'staff.home.actions.business', descriptionKey: 'staff.home.actions.businessHint' },
  { key: 'team', to: '/settings/team', icon: Users, titleKey: 'staff.home.actions.team', descriptionKey: 'staff.home.actions.teamHint' },
  { key: 'site', to: '/settings/public-experience', icon: Globe, titleKey: 'staff.home.actions.site', descriptionKey: 'staff.home.actions.siteHint' },
];

/** Shortcuts filtered by the same destination rules the router enforces. */
export function QuickActions() {
  const { session } = useSession();
  const { t } = useTranslation();
  const actions = ACTIONS.filter((action) => isAllowedDestination(action.to, session));
  if (!actions.length) return null;
  return (
    <nav aria-label={t('staff.home.actions.title')} className="-mx-2">
      <ul>
            {actions.map(({ key, to, icon: Icon, titleKey, descriptionKey }) => (
              <li key={key}>
                <Link
                  to={to}
                  data-qa={`home-action-${key}`}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{t(titleKey)}</span>
                    <span className="block text-xs text-muted-foreground">{t(descriptionKey)}</span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </nav>
  );
}
