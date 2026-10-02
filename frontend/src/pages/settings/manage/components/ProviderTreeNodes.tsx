/** Nodes of the provider-centric tree: provider → organization → location → service → event type. */
import { Building2, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/badge';
import { useTranslation } from '@/lib/i18n';
import type { DeleteTarget, ProviderLocationNode, ProviderNode, ProviderOrgNode, ProviderServiceNode, Row } from '../types';
import { ValidationBadge } from './ValidationBadge';
import { BookingUrlList } from './BookingUrlList';
import { ItemCard } from './ItemCard';
import { IssueList } from './IssueList';
import { Branch, TreeToggle } from './TreeSection';
import { eventTypeFix, locationFix, providerFix, serviceFix, type FixHandlers } from './providerFixActions';

export interface NodeContext {
  handlers: FixHandlers;
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
  onDelete: (target: DeleteTarget) => void;
}

const domId = (key: string) => `manage-node-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

export function ProviderNodeView({ provider, ctx }: { provider: ProviderNode; ctx: NodeContext }) {
  const { t } = useTranslation();
  const open = ctx.isOpen(provider.name);
  const issues = provider.validation?.issues ?? [];
  const panel = domId(provider.name);
  return (
    <section className="min-w-0 rounded-xl border bg-card shadow-card" aria-label={provider.provider_name}>
      <div className="p-2 sm:p-3">
        <TreeToggle expanded={open} onToggle={() => ctx.toggle(provider.name)} controls={panel}>
          <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 break-words text-base font-semibold text-foreground">{provider.provider_name}</span>
          <ValidationBadge status={provider.validation?.status} />
          {provider.organizations?.some((org) => org.is_primary) && <Badge variant="info">{t('staff.manage.primary')}</Badge>}
        </TreeToggle>
      </div>
      {(issues.length > 0 || !!provider.booking_urls?.length) && (
        <div className="space-y-3 border-t px-3 py-3 sm:px-4">
          <IssueList title={t('staff.manage.issuesFound')} issues={issues} fixFor={providerFix(ctx.handlers, provider)} />
          <BookingUrlList urls={provider.booking_urls} />
        </div>
      )}
      {open && provider.organizations?.length > 0 && (
        <div id={panel} className="space-y-3 border-t px-3 py-3 sm:px-4">
          {provider.organizations.map((org) => (
            <OrgNodeView key={org.name} provider={provider} org={org} ctx={ctx} />
          ))}
        </div>
      )}
    </section>
  );
}

function OrgNodeView({ provider, org, ctx }: { provider: ProviderNode; org: ProviderOrgNode; ctx: NodeContext }) {
  const { t } = useTranslation();
  const key = `${provider.name}-${org.name}`;
  const open = ctx.isOpen(key);
  return (
    <div className="min-w-0">
      <TreeToggle expanded={open} onToggle={() => ctx.toggle(key)} controls={domId(key)}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 break-words text-sm font-medium text-foreground">{org.organization_name}</span>
        {Boolean(org.is_primary) && <Badge variant="info">{t('staff.manage.primary')}</Badge>}
      </TreeToggle>
      {open && org.locations?.length > 0 && (
        <Branch id={domId(key)} className="mt-1">
          {org.locations.map((location) => (
            <LocationNodeView key={location.name} provider={provider} org={org} location={location} parentKey={key} ctx={ctx} />
          ))}
        </Branch>
      )}
    </div>
  );
}

interface LocationProps {
  provider: ProviderNode;
  org: ProviderOrgNode;
  location: ProviderLocationNode;
  parentKey: string;
  ctx: NodeContext;
}

function LocationNodeView({ provider, org, location, parentKey, ctx }: LocationProps) {
  const { t } = useTranslation();
  const key = `${parentKey}-${location.name}`;
  const open = ctx.isOpen(key);
  return (
    <div className="min-w-0">
      <TreeToggle expanded={open} onToggle={() => ctx.toggle(key)} controls={domId(key)}>
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 break-words text-sm font-medium text-foreground">{location.location_name}</span>
        {location.validation && <ValidationBadge status={location.validation.status} />}
      </TreeToggle>
      {open && (
        <Branch id={domId(key)} className="mt-1">
          <IssueList
            compact
            title={t('staff.manage.locationIssues')}
            issues={location.validation?.issues ?? []}
            fixFor={locationFix(ctx.handlers, location)}
          />
          {location.services?.map((service) => (
            <ServiceNodeView key={service.name} service={service} provider={provider} org={org} location={location} ctx={ctx} />
          ))}
        </Branch>
      )}
    </div>
  );
}

function ServiceNodeView({ service, provider, org, location, ctx }: Omit<LocationProps, 'parentKey'> & { service: ProviderServiceNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-2">
      <ItemCard type="service" item={service} onEdit={() => ctx.handlers.edit({ ...service, type: 'service', name: service.name })} />
      <IssueList
        compact
        title={t('staff.manage.serviceIssues')}
        issues={service.validation?.issues ?? []}
        fixFor={serviceFix(ctx.handlers, { service, provider, org, location })}
      />
      {service.event_types?.length > 0 && (
        <Branch>
          {service.event_types.map((et: Row) => (
            <div key={et.name} className="space-y-2">
              <ItemCard
                type="event_type"
                item={et}
                nested
                onEdit={() => ctx.handlers.edit({ ...et, type: 'event_type', name: et.name })}
                onDelete={() => ctx.onDelete({ type: 'event_type', id: et.name, label: et.event_type_name })}
              />
              <IssueList compact title={t('staff.manage.eventTypeIssues')} issues={et.validation?.issues ?? []} fixFor={eventTypeFix(ctx.handlers, et)} />
            </div>
          ))}
        </Branch>
      )}
    </div>
  );
}
