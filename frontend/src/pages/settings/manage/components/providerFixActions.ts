/** Maps validation issue text from the API to a one-click fix in the provider tree. */
import { toast } from 'sonner';
import type { EditTarget, ProviderLocationNode, ProviderNode, ProviderOrgNode, ProviderServiceNode, Row } from '../types';
import type { FixAction } from './IssueList';
import type { CreateContext } from './providerOptions';

export interface FixHandlers {
  t: (key: string) => string;
  edit: (target: EditTarget) => void;
  create: (context: CreateContext) => void;
}

const has = (text: string, ...needles: string[]) => needles.some((n) => text.toLowerCase().includes(n));

export function providerFix({ t, create }: FixHandlers, provider: ProviderNode) {
  return (issue: string): FixAction | null => {
    if (has(issue, 'no eventtypes', 'no event types')) {
      return {
        label: t('staff.manage.fix.createEventType'),
        action: () => {
          const firstOrg = provider.organizations?.[0];
          if (firstOrg) create({ provider: provider.name, organization: firstOrg.name });
        },
      };
    }
    if (has(issue, 'availability')) {
      return { label: t('staff.manage.fix.setAvailability'), action: () => toast.info('Please set availability in the provider settings') };
    }
    return null;
  };
}

export function locationEditTarget(location: ProviderLocationNode): EditTarget {
  return {
    type: 'location',
    name: location.name,
    location_name: location.location_name,
    address_line_1: location.address_line_1,
    address_line_2: location.address_line_2,
    city: location.city,
    phone: location.phone,
    timezone: location.timezone,
  };
}

export function locationFix({ t, edit }: FixHandlers, location: ProviderLocationNode) {
  return (issue: string): FixAction => ({
    label: has(issue, 'missing address', 'no address', 'timezone') ? t('staff.manage.fix.editLocation') : t('staff.manage.fix.fix'),
    action: () => edit(locationEditTarget(location)),
  });
}

export function serviceFix({ t, edit, create }: FixHandlers, ctx: { service: ProviderServiceNode; provider: ProviderNode; org: ProviderOrgNode; location: ProviderLocationNode }) {
  return (issue: string): FixAction | null => {
    if (has(issue, 'no providers', 'no provider')) {
      return {
        label: t('staff.manage.fix.linkProvider'),
        action: () => {
          toast.info('Use the Edit button to link providers to this service');
          edit({ ...ctx.service, type: 'service', name: ctx.service.name });
        },
      };
    }
    if (has(issue, 'no eventtypes', 'no event types')) {
      return {
        label: t('staff.manage.fix.createEventType'),
        action: () => create({ service: ctx.service.name, provider: ctx.provider.name, organization: ctx.org.name, location: ctx.location.name }),
      };
    }
    return null;
  };
}

export function eventTypeFix({ t, edit }: FixHandlers, et: Row) {
  return (issue: string): FixAction => {
    if (has(issue, 'availability')) {
      return { label: t('staff.manage.fix.setAvailability'), action: () => toast.info('Please set provider availability in settings') };
    }
    const target = { ...et, type: 'event_type' as const, name: et.name };
    const label = has(issue, 'missing location', 'no location', 'missing provider', 'no provider') ? t('staff.manage.fix.editEventType') : t('staff.manage.fix.fix');
    return { label, action: () => edit(target) };
  };
}
