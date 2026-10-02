/** Structure for a solo provider: their event types and the locations they work at. */
import { useState } from 'react';
import { CalendarClock, MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { matchesQuery, type EditTarget, type IndividualProvider, type OrgOptions } from '../types';
import { ItemCard } from './ItemCard';
import { SectionEmpty, TreeSection } from './TreeSection';
import { EditItemModal } from './EditItemModal';
import { useItemDeletion } from './useItemDeletion';

interface Props {
  provider: IndividualProvider;
  onRefresh: () => void;
  query: string;
}

export function IndividualProviderTree({ provider, onRefresh, query }: Props) {
  const { t } = useTranslation();
  // Collapsed by default, as before the redesign.
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<EditTarget | null>(null);
  const { requestDelete, dialog } = useItemDeletion(onRefresh);
  const eventTypes = (provider.event_types ?? []).filter((et) => matchesQuery(et.event_type_name, query));
  const locations = (provider.locations ?? []).filter((l) => matchesQuery(l.location_name, query));

  return (
    <div className="space-y-4">
      <TreeSection
        id="event-types"
        icon={CalendarClock}
        title={t('staff.manage.eventTypes')}
        count={eventTypes.length}
        expanded={open}
        onToggle={() => setOpen((value) => !value)}
        toggleQa="manage-event-types-toggle"
      >
        {eventTypes.length === 0 ? (
          <SectionEmpty>{provider.event_types?.length && query ? t('staff.manage.noMatches') : t('staff.manage.empty.eventTypes')}</SectionEmpty>
        ) : (
          eventTypes.map((et) => (
            <ItemCard
              key={et.name}
              type="event_type"
              item={et}
              onEdit={() => setEditItem({ ...et, type: 'event_type', name: et.name })}
              onDelete={() => requestDelete({ type: 'event_type', id: et.name, label: et.event_type_name })}
            />
          ))
        )}
      </TreeSection>

      {provider.locations?.length > 0 && (
        <TreeSection id="provider-locations" icon={MapPin} title={t('staff.manage.sections.locations')} count={locations.length}>
          {locations.length === 0 ? (
            <SectionEmpty>{t('staff.manage.noMatches')}</SectionEmpty>
          ) : (
            locations.map((location) => <ItemCard key={location.name} type="location" item={location} />)
          )}
        </TreeSection>
      )}

      {editItem && (
        <EditItemModal
          isOpen
          onClose={() => setEditItem(null)}
          item={editItem}
          organization={{
            services: (provider.services || []) as OrgOptions['services'],
            providers: [{ name: provider.name, provider_name: provider.provider_name }],
            locations: (provider.locations || []) as OrgOptions['locations'],
          }}
          onSuccess={onRefresh}
        />
      )}
      {dialog}
    </div>
  );
}
