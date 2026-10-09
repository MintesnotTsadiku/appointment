import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  Contact,
  Globe,
  LayoutDashboard,
  ListTree,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  Armchair,
  FileSpreadsheet,
  Palette,
} from 'lucide-react';
import { isAllowedDestination, type SessionState } from '@/context/session';

export interface NavItem {
  key: string;
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** Stable hook for QA and analytics. */
  qa: string;
}

export interface SettingsGroup {
  key: string;
  labelKey: string;
  items: Array<NavItem & { descriptionKey: string; managerOnly?: boolean }>;
}

/**
 * Primary destinations. Visibility mirrors the former AppTopNav rules, except
 * Settings also appears for providers, who may open their own settings pages.
 * The server still enforces every route.
 */
export function primaryNav(session: SessionState | null): NavItem[] {
  if (!session?.authenticated || !['workspace', 'administrator', 'individual_owner'].includes(session.state)) return [];
  const selected = session.selected;
  // An independent provider runs their own business, so they see the manager destinations.
  const isManager = Boolean(session.is_administrator || selected?.is_manager || session.state === 'individual_owner');
  const isReceptionist = selected?.role === 'Receptionist';
  const items: Array<NavItem & { show: boolean }> = [
    { key: 'home', labelKey: 'staff.nav.overview', to: '/home', icon: LayoutDashboard, qa: 'nav-home', show: isManager },
    { key: 'reception', labelKey: 'staff.nav.reception', to: '/reception', icon: Users, qa: 'nav-reception', show: isManager || isReceptionist },
    { key: 'customers', labelKey: 'staff.customers.nav', to: '/customers', icon: Contact, qa: 'nav-customers', show: Boolean(selected) || session.state === 'individual_owner' },
    { key: 'calendar', labelKey: 'staff.nav.schedule', to: '/calendar', icon: CalendarDays, qa: 'nav-calendar', show: !isManager },
    { key: 'analytics', labelKey: 'staff.nav.insights', to: '/analytics', icon: BarChart3, qa: 'nav-analytics', show: Boolean(selected) || session.state === 'individual_owner' },
    { key: 'settings', labelKey: 'staff.nav.settings', to: '/settings', icon: Settings, qa: 'nav-settings', show: isManager || settingsNav(session).length > 0 },
    { key: 'admin', labelKey: 'staff.nav.admin', to: '/admin/dashboard', icon: ShieldCheck, qa: 'nav-admin', show: session.is_administrator },
    { key: 'admin-payments', labelKey: 'staff.adminPayments.title', to: '/admin/payments', icon: Wallet, qa: 'nav-admin-payments', show: session.is_administrator },
  ];
  return items.filter((item) => item.show);
}

const SETTINGS: SettingsGroup[] = [
  {
    key: 'business',
    labelKey: 'staff.settings.groups.business',
    items: [
      { key: 'business', labelKey: 'staff.settings.business.title', descriptionKey: 'staff.settings.business.description', to: '/settings/business', icon: Building2, qa: 'settings-nav-business' },
      { key: 'services', labelKey: 'staff.settings.services.title', descriptionKey: 'staff.settings.services.description', to: '/settings/services', icon: Briefcase, qa: 'settings-nav-services' },
      { key: 'location', labelKey: 'staff.settings.location.title', descriptionKey: 'staff.settings.location.description', to: '/settings/location', icon: MapPin, qa: 'settings-nav-location' },
      { key: 'resources', labelKey: 'staff.resources.title', descriptionKey: 'staff.resources.description', to: '/settings/resources', icon: Armchair, qa: 'settings-nav-resources', managerOnly: true },
      { key: 'payments', labelKey: 'staff.payments.navTitle', descriptionKey: 'staff.payments.navDescription', to: '/settings/payments', icon: Wallet, qa: 'settings-nav-payments', managerOnly: true },
      { key: 'notifications', labelKey: 'staff.settings.notifications.title', descriptionKey: 'staff.settings.notifications.description', to: '/settings/notifications', icon: Mail, qa: 'settings-nav-notifications', managerOnly: true },
      { key: 'independent-booking', labelKey: 'staff.settings.independentBooking.title', descriptionKey: 'staff.settings.independentBooking.description', to: '/settings/independent-booking', icon: Building2, qa: 'settings-nav-independent-booking', managerOnly: true },
      { key: 'website', labelKey: 'staff.settings.website.title', descriptionKey: 'staff.settings.website.description', to: '/settings/website', icon: Globe, qa: 'settings-nav-website', managerOnly: true },
      { key: 'organization-import', labelKey: 'staff.settings.organizationImport.title', descriptionKey: 'staff.settings.organizationImport.description', to: '/settings/organization-import', icon: FileSpreadsheet, qa: 'settings-nav-organization-import', managerOnly: true },
      { key: 'public-experience', labelKey: 'staff.settings.publicExperience.title', descriptionKey: 'staff.settings.publicExperience.description', to: '/settings/public-experience', icon: Globe, qa: 'settings-nav-public-experience', managerOnly: true },
    ],
  },
  {
    key: 'people',
    labelKey: 'staff.settings.groups.people',
    items: [
      { key: 'team', labelKey: 'staff.settings.team.title', descriptionKey: 'staff.settings.team.description', to: '/settings/team', icon: Users, qa: 'settings-nav-team' },
      { key: 'manage', labelKey: 'staff.settings.manage.title', descriptionKey: 'staff.settings.manage.description', to: '/settings/manage', icon: ListTree, qa: 'settings-nav-manage', managerOnly: true },
    ],
  },
  {
    key: 'personal',
    labelKey: 'staff.settings.groups.personal',
    items: [
      { key: 'profile', labelKey: 'staff.settings.profile.title', descriptionKey: 'staff.settings.profile.description', to: '/settings/profile', icon: User, qa: 'settings-nav-profile' },
      { key: 'appearance', labelKey: 'staff.settings.appearance.title', descriptionKey: 'staff.settings.appearance.description', to: '/settings/appearance', icon: Palette, qa: 'settings-nav-appearance' },
      { key: 'availability', labelKey: 'staff.settings.availability.title', descriptionKey: 'staff.settings.availability.description', to: '/settings/availability', icon: Clock, qa: 'settings-nav-availability' },
      { key: 'calendar', labelKey: 'staff.settings.calendar.title', descriptionKey: 'staff.settings.calendar.description', to: '/settings/calendar', icon: CalendarClock, qa: 'settings-nav-calendar' },
    ],
  },
];

/**
 * Settings pages the current session may open, grouped for navigation.
 * Business-wide tools stay hidden from staff without manager authority even
 * where the client route guard is looser; the server still decides access.
 */
export function settingsNav(session: SessionState | null): SettingsGroup[] {
  const manager = Boolean(session?.is_administrator || session?.selected?.is_manager || session?.state === 'individual_owner');
  return SETTINGS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      isAllowedDestination(item.to, session) && (manager || !item.managerOnly)
      // The independent booking page belongs to an independent provider's own business only.
      && (item.key !== 'independent-booking' || session?.state === 'individual_owner')),
  })).filter((group) => group.items.length > 0);
}

/** True when `pathname` belongs to the nav item, including nested pages. */
export function isActivePath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Routes rendered inside StaffShell; keeps staff tokens on during lazy loads. */
export const STAFF_PREFIXES = ['/home', '/calendar', '/reception', '/analytics', '/settings', '/workspaces', '/onboarding', '/no-access', '/admin'];

export function isStaffPath(pathname: string): boolean {
  return STAFF_PREFIXES.some((prefix) => isActivePath(pathname, prefix));
}
