/**
 * Organization structure: services (with linked providers and event types),
 * locations and providers. The individual-provider variant lives in IndividualProviderTree.
 */
import { useState } from 'react';
import { Building2, Layers, MapPin, Plus, Users } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { matchesQuery, type EditTarget, type IndividualProvider, type OrganizationNode, type OrgOptions, type Row } from '../types';
import { ValidationBadge } from './ValidationBadge';
import { BookingUrlList } from './BookingUrlList';
import { ItemCard } from './ItemCard';
import { SectionEmpty, SubList, TreeSection } from './TreeSection';
import { CreateItemModal } from './CreateItemModal';
import { EditItemModal } from './EditItemModal';
import { useItemDeletion } from './useItemDeletion';
import { IndividualProviderTree } from './IndividualProviderTree';

interface HierarchyTreeProps {
  organization?: OrganizationNode;
  provider?: IndividualProvider;
  onRefresh: () => void;
  query?: string;
}

type SectionKey = 'services' | 'locations' | 'providers';

export const HierarchyTree = ({ organization, provider, onRefresh, query = '' }: HierarchyTreeProps) => {
  if (organization) return <OrganizationTree organization={organization} onRefresh={onRefresh} query={query} />;
  if (provider) return <IndividualProviderTree provider={provider} onRefresh={onRefresh} query={query} />;
  return null;
};

function useSections() {
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set(['services', 'locations', 'providers']));
  const toggle = (key: SectionKey) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { isOpen: (key: SectionKey) => expanded.has(key), toggle };
}

function OrganizationTree({ organization, onRefresh, query }: { organization: OrganizationNode; onRefresh: () => void; query: string }) {
  const { t } = useTranslation();
  const sections = useSections();
  const [createType, setCreateType] = useState<'service' | 'location' | null>(null);
  const [editItem, setEditItem] = useState<EditTarget | null>(null);
  const { requestDelete, dialog } = useItemDeletion(onRefresh);
  const options = { services: organization.services, providers: organization.providers, locations: organization.locations } as OrgOptions;

  const services = (organization.services ?? []).filter((s) => matchesQuery(s.service_name, query));
  const locations = (organization.locations ?? []).filter((l) => matchesQuery(l.location_name, query) || matchesQuery(l.address, query));
  const providers = (organization.providers ?? []).filter((p) => matchesQuery(p.provider_name, query) || matchesQuery(p.email, query));
  const empty = (total: number, key: string) => <SectionEmpty>{total && query ? t('staff.manage.noMatches') : t(key)}</SectionEmpty>;

  return (
    <div className="space-y-4">
      <section className="min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-card sm:p-5" aria-label={organization.organization_name}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <h2 className="min-w-0 break-words text-base font-semibold text-foreground">{organization.organization_name}</h2>
          <ValidationBadge status={organization.validation?.status} />
        </div>
        {!!organization.booking_urls?.length && (
          <div className="border-t pt-3">
            <BookingUrlList urls={organization.booking_urls} showType />
          </div>
        )}
      </section>

      <TreeSection
        id="services"
        icon={Layers}
        title={t('staff.manage.sections.services')}
        count={services.length}
        expanded={sections.isOpen('services')}
        onToggle={() => sections.toggle('services')}
        toggleQa="manage-services-toggle"
        action={
          <Button size="sm" variant="outline" data-qa="manage-add-service" onClick={() => setCreateType('service')}>
            <Plus aria-hidden="true" />
            {t('staff.manage.addService')}
          </Button>
        }
      >
        {services.length === 0
          ? empty(organization.services?.length ?? 0, 'staff.manage.empty.services')
          : services.map((service) => (
              <ServiceItem
                key={service.name}
                service={service}
                onEdit={(target) => setEditItem(target)}
                onDelete={requestDelete}
              />
            ))}
      </TreeSection>

      <TreeSection
        id="locations"
        icon={MapPin}
        title={t('staff.manage.sections.locations')}
        count={locations.length}
        expanded={sections.isOpen('locations')}
        onToggle={() => sections.toggle('locations')}
        toggleQa="manage-locations-toggle"
        action={
          <Button size="sm" variant="outline" data-qa="manage-add-location" onClick={() => setCreateType('location')}>
            <Plus aria-hidden="true" />
            {t('staff.manage.addLocation')}
          </Button>
        }
      >
        {locations.length === 0
          ? empty(organization.locations?.length ?? 0, 'staff.manage.empty.locations')
          : locations.map((location) => (
              <ItemCard
                key={location.name}
                type="location"
                item={location}
                onEdit={() => setEditItem({ ...location, type: 'location', name: location.name })}
                onDelete={() => requestDelete({ type: 'location', id: location.name, label: location.location_name })}
              />
            ))}
      </TreeSection>

      <TreeSection
        id="providers"
        icon={Users}
        title={t('staff.manage.sections.providers')}
        count={providers.length}
        expanded={sections.isOpen('providers')}
        onToggle={() => sections.toggle('providers')}
        toggleQa="manage-providers-toggle"
      >
        {providers.length === 0
          ? empty(organization.providers?.length ?? 0, 'staff.manage.empty.providers')
          : providers.map((item) => <ItemCard key={item.name} type="provider" item={item} />)}
      </TreeSection>

      {createType && (
        <CreateItemModal
          isOpen
          onClose={() => setCreateType(null)}
          type={createType}
          organizationId={organization.name}
          organization={options}
          onSuccess={onRefresh}
        />
      )}
      {editItem && <EditItemModal isOpen onClose={() => setEditItem(null)} item={editItem} organization={options} onSuccess={onRefresh} />}
      {dialog}
    </div>
  );
}

interface ServiceItemProps {
  service: Row;
  onEdit: (target: EditTarget) => void;
  onDelete: (target: { type: 'service' | 'event_type'; id: string; label: string }) => void;
}

function ServiceItem({ service, onEdit, onDelete }: ServiceItemProps) {
  const { t } = useTranslation();
  const linked: Row[] = service.service_providers ?? [];
  const eventTypes: Row[] = service.event_types ?? [];
  return (
    <ItemCard
      type="service"
      item={service}
      onEdit={() => onEdit({ ...service, type: 'service', name: service.name })}
      onDelete={() => onDelete({ type: 'service', id: service.name, label: service.service_name })}
    >
      {linked.length > 0 && (
        <SubList label={t('staff.manage.linkedProviders')}>
          {linked.map((sp, idx) => (
            <p key={idx} className="break-words text-sm text-foreground">
              {sp.provider_name} {Boolean(sp.is_primary) && <span className="text-muted-foreground">({t('staff.manage.primary')})</span>}
            </p>
          ))}
        </SubList>
      )}
      {eventTypes.length > 0 && (
        <SubList label={t('staff.manage.eventTypes')}>
          {eventTypes.map((et) => (
            <ItemCard
              key={et.name}
              type="event_type"
              item={et}
              nested
              onEdit={() => onEdit({ ...et, type: 'event_type', name: et.name })}
              onDelete={() => onDelete({ type: 'event_type', id: et.name, label: et.event_type_name })}
            />
          ))}
        </SubList>
      )}
    </ItemCard>
  );
}
