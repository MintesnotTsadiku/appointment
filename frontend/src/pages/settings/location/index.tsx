import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Clock, MapPin, Plus, Video } from 'lucide-react';
import { Button } from '@/components/button';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { Bone, EmptyState, ErrorState } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { LocationCard } from './LocationCard';
import { LocationFormDialog } from './LocationFormDialog';
import { DeleteLocationDialog } from './DeleteLocationDialog';
import { LOCATIONS_API, type Location, type LocationKind, type LocationOverview } from './types';

/** Places of the businesses this user manages: offices with an address and online locations with a video link. */
const LocationSettings = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startKind, setStartKind] = useState<LocationKind>('In person');
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null);

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: LocationOverview }>(`${LOCATIONS_API}.overview`, undefined, 'location-overview');
  const { call: removeLocation, loading: deleting } = useFrappePostCall(`${LOCATIONS_API}.remove`);

  const overview = data?.message;
  const locations = overview?.locations || [];
  const owners = overview?.owners || [];

  const openCreate = (kind: LocationKind = 'In person') => {
    setEditingLocation(null);
    setStartKind(kind);
    setDialogOpen(true);
  };

  // "Add an online location" links from other settings pages open the dialog on the online type.
  useEffect(() => {
    if (params.get('new') !== 'online' || !overview) return;
    openCreate('Online');
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, overview]);

  const openEdit = (location: Location) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeLocation({ location: pendingDelete.name });
      toast.success(t('staff.locations.deleted'));
      mutate();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.locations.deleteFailed'));
    } finally {
      setPendingDelete(null);
    }
  };

  const actions = locations.length > 0 ? (
    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button type="button" variant="outline" onClick={() => openCreate('Online')} data-qa="location-add-online">
        <Video aria-hidden="true" />
        {t('staff.locations.addOnline')}
      </Button>
      <Button type="button" onClick={() => openCreate()} data-qa="location-add">
        <Plus aria-hidden="true" />
        {t('staff.locations.add')}
      </Button>
    </div>
  ) : undefined;

  return (
    <SettingsPage
      title={t('staff.settings.location.title')}
      description={t('staff.settings.location.description')}
      actions={actions}
    >
      <div className="space-y-6">
        <SettingsSection title={t('staff.locations.listTitle')} description={t('staff.locations.about')}>
          <LocationList
            isLoading={isLoading}
            error={error}
            locations={locations}
            canManage={!overview || owners.length > 0}
            showOwner={owners.length > 1}
            ownerLabel={(key) => owners.find((owner) => owner.key === key)?.label ?? ''}
            onRetry={() => mutate()}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            deleting={deleting}
          />
        </SettingsSection>

        {locations.length > 0 && <AvailabilityLink />}
      </div>

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingLocation={editingLocation}
        startKind={startKind}
        owners={owners}
        platforms={overview?.platforms || []}
        sessions={overview?.sessions || []}
        onSaved={() => mutate()}
      />
      <DeleteLocationDialog
        location={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </SettingsPage>
  );
};

interface LocationListProps {
  isLoading: boolean;
  error: unknown;
  locations: Location[];
  /** False when the user manages no business: providers and receptionists only see this page. */
  canManage: boolean;
  showOwner: boolean;
  ownerLabel: (key: string) => string;
  deleting: boolean;
  onRetry: () => void;
  onCreate: (kind?: LocationKind) => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

function LocationList({ isLoading, error, locations, canManage, showOwner, ownerLabel, deleting, onRetry, onCreate, onEdit, onDelete }: LocationListProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
        <Bone className="h-36 rounded-xl" />
        <Bone className="h-36 rounded-xl" />
      </div>
    );
  }
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!canManage) return <EmptyState icon={MapPin} title={t('staff.locations.noOwnerTitle')} description={t('staff.locations.noOwner')} />;
  if (locations.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t('staff.locations.emptyTitle')}
        description={t('staff.locations.emptyDescription')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => onCreate()} data-qa="location-add">
              <Plus aria-hidden="true" />
              {t('staff.locations.addFirst')}
            </Button>
            <Button type="button" variant="outline" onClick={() => onCreate('Online')} data-qa="location-add-online">
              <Video aria-hidden="true" />
              {t('staff.locations.addOnline')}
            </Button>
          </div>
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {locations.map((location) => (
        <li key={location.name} className="min-w-0">
          <LocationCard location={location} owner={showOwner ? ownerLabel(location.owner) : ''} deleting={deleting} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}

function AvailabilityLink() {
  const { t } = useTranslation();
  return (
    <SettingsSection
      title={t('staff.locations.hoursTitle')}
      description={t('staff.locations.hoursDescription')}
      aside={
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/availability">
            <Clock aria-hidden="true" />
            {t('staff.locations.editAvailability')}
          </Link>
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">{t('staff.locations.hoursHint')}</p>
    </SettingsSection>
  );
}

export default LocationSettings;
