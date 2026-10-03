import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Armchair, CalendarOff, Pencil, Plus, X } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Switch } from '@/components/switch';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { BlockDialog } from './BlockDialog';
import { BookingList } from './BookingList';
import { ResourceDialog } from './ResourceDialog';
import { API, wallTime, type Resource, type ResourceBlock, type ResourcesOverview, type ResourceType } from './types';

/** Rooms and equipment for the selected business: types, resources per location, blocks, and bookings still missing one. */
export default function ResourceSettings() {
  const { t } = useTranslation();
  const organization = useSession().session?.selected?.organization;
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: ResourcesOverview }>(
    `${API}.overview`, organization ? { organization } : undefined, organization ? `resources-${organization}` : null
  );
  const [editing, setEditing] = useState<{ resource: Resource | null; location?: string } | null>(null);
  const [blocking, setBlocking] = useState<Resource | null>(null);
  const overview = data?.message;

  return (
    <SettingsPage title={t('staff.resources.title')} description={t('staff.resources.description')}>
      {error ? (
        <ErrorState onRetry={() => void mutate()} />
      ) : isLoading || !overview || !organization ? (
        <ListSkeleton count={4} />
      ) : (
        <div className="space-y-6" data-qa="resource-settings">
          {!overview.can_manage && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{t('staff.resources.readOnly')}</p>}
          {overview.unassigned.length > 0 && (
            <SettingsSection title={t('staff.resources.unassignedTitle')} description={t('staff.resources.unassignedHint')}>
              <BookingList rows={overview.unassigned} qa="resource-unassigned" />
            </SettingsSection>
          )}
          <TypesSection organization={organization} types={overview.types} canManage={overview.can_manage} onChanged={() => void mutate()} />
          {overview.types.length > 0 && (
            <SettingsSection title={t('staff.resources.resourcesTitle')} description={t('staff.resources.resourcesHint')}>
              <div className="space-y-6">
                {overview.locations.map((location) => (
                  <LocationResources
                    key={location.name}
                    name={location.location_name}
                    resources={overview.resources.filter((row) => row.location === location.name)}
                    types={overview.types}
                    blocks={overview.blocks}
                    canManage={overview.can_manage}
                    onAdd={() => setEditing({ resource: null, location: location.name })}
                    onEdit={(resource) => setEditing({ resource })}
                    onBlock={setBlocking}
                    onChanged={() => void mutate()}
                  />
                ))}
              </div>
            </SettingsSection>
          )}
          <ResourceDialog
            open={Boolean(editing)}
            organization={organization}
            resource={editing?.resource ?? null}
            defaultLocation={editing?.location}
            types={overview.types}
            locations={overview.locations}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); void mutate(); }}
          />
          <BlockDialog resource={blocking} onClose={() => setBlocking(null)} onSaved={() => { setBlocking(null); void mutate(); }} />
        </div>
      )}
    </SettingsPage>
  );
}

function TypesSection({ organization, types, canManage, onChanged }: { organization: string; types: ResourceType[]; canManage: boolean; onChanged: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { call, loading } = useFrappePostCall(`${API}.save_type`);

  async function save(values: { name?: string; type_name: string; is_active: number }) {
    try {
      await call({ organization, ...values });
      toast.success(t('staff.resources.saved'));
      setName('');
      onChanged();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.resources.saveFailed'));
    }
  }

  return (
    <SettingsSection title={t('staff.resources.typesTitle')} description={t('staff.resources.typesHint')}>
      <div className="space-y-4">
        {types.length === 0 && (
          <EmptyState compact icon={Armchair} title={t('staff.resources.emptyTitle')} description={t('staff.resources.emptyDescription')} />
        )}
        {types.length > 0 && (
          <ul className="divide-y rounded-lg border" data-qa="resource-types">
            {types.map((type) => (
              <li key={type.name} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5" data-qa="resource-type-row">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {type.type_name}
                    {!type.is_active && <Badge variant="muted">{t('staff.resources.off')}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type.services.length ? t('staff.resources.neededBy').replace('{0}', type.services.join(', ')) : t('staff.resources.notNeeded')}
                  </p>
                </div>
                {canManage && (
                  <Switch aria-label={`${type.type_name}: ${t('staff.resources.active')}`} checked={type.is_active === 1} disabled={loading}
                    onCheckedChange={(on) => void save({ name: type.name, type_name: type.type_name, is_active: on ? 1 : 0 })} />
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); if (name.trim()) void save({ type_name: name.trim(), is_active: 1 }); }}>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="resource-type-name">{t('staff.resources.typeName')}</Label>
              <Input id="resource-type-name" data-qa="resource-type-name" value={name} maxLength={60} placeholder={t('staff.resources.typePlaceholder')} onChange={(event) => setName(event.target.value)} />
            </div>
            <Button type="submit" data-qa="resource-type-add" disabled={!name.trim() || loading}>
              <Plus aria-hidden="true" />
              {t('staff.resources.addType')}
            </Button>
          </form>
        )}
      </div>
    </SettingsSection>
  );
}

function LocationResources({ name, resources, types, blocks, canManage, onAdd, onEdit, onBlock, onChanged }: {
  name: string;
  resources: Resource[];
  types: ResourceType[];
  blocks: ResourceBlock[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (resource: Resource) => void;
  onBlock: (resource: Resource) => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const typeName = (type: string) => types.find((row) => row.name === type)?.type_name ?? type;
  return (
    <section className="space-y-3" data-qa="resource-location" data-qa-location={name}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        {canManage && (
          <Button type="button" size="sm" variant="outline" data-qa="resource-add" onClick={onAdd}>
            <Plus aria-hidden="true" />
            {t('staff.resources.addResource')}
          </Button>
        )}
      </div>
      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('staff.resources.noResources')}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {resources.map((resource) => (
            <li key={resource.name} className="space-y-2 rounded-lg border p-3" data-qa="resource-card" data-qa-name={resource.resource_name}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{resource.resource_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{typeName(resource.resource_type)}</Badge>
                    {!resource.is_active && <Badge variant="muted">{t('staff.resources.off')}</Badge>}
                  </div>
                  {resource.notes && <p className="mt-1 text-xs text-muted-foreground">{resource.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label={t('staff.resources.editResource')} data-qa="resource-edit" onClick={() => onEdit(resource)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={t('staff.resources.blockTime')} data-qa="resource-block" onClick={() => onBlock(resource)}>
                      <CalendarOff aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
              <Blocks rows={blocks.filter((block) => block.resource === resource.name)} canManage={canManage} onChanged={onChanged} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Blocks({ rows, canManage, onChanged }: { rows: ResourceBlock[]; canManage: boolean; onChanged: () => void }) {
  const { t } = useTranslation();
  const { call, loading } = useFrappePostCall(`${API}.delete_block`);
  if (!rows.length) return null;
  return (
    <ul className="space-y-1 border-t pt-2 text-xs" aria-label={t('staff.resources.blockTime')}>
      {rows.map((block) => (
        <li key={block.name} className="flex items-center justify-between gap-2" data-qa="resource-block-row">
          <span className="min-w-0 text-muted-foreground">
            <CalendarOff className="mr-1 inline h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">{wallTime(block.local_start)} – {wallTime(block.local_end)}</span>
            {block.reason && <> · {block.reason}</>}
          </span>
          {canManage && (
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={t('staff.resources.removeBlock')} disabled={loading}
              onClick={async () => {
                try {
                  await call({ name: block.name });
                  onChanged();
                } catch (err) {
                  toast.error(serverErrorMessage(err) || t('staff.resources.saveFailed'));
                }
              }}>
              <X aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
