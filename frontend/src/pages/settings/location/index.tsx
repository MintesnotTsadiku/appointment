import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Clock, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/button';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { Bone, EmptyState, ErrorState } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { LocationCard } from './LocationCard';
import { LocationFormDialog } from './LocationFormDialog';
import { DeleteLocationDialog } from './DeleteLocationDialog';
import type { Location, ProviderOption, ServiceOption } from './types';

interface LocationOptions {
  providers: ProviderOption[];
  services: ServiceOption[];
}

const LocationSettings = () => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null);

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.onboarding.get_provider_locations',
    undefined,
    'provider-locations'
  );
  const { data: optionsData } = useFrappeGetCall<{ message: LocationOptions }>(
    'appointment.onboarding.get_location_options',
    undefined,
    'location-options'
  );
  const { call: deleteLocation, loading: deleting } = useFrappePostCall('appointment.onboarding.delete_location');

  const locations = data?.message?.locations || [];

  const openCreate = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteLocation({ location_name: pendingDelete.location_name });
      toast.success(t('staff.locations.deleted'));
      mutate();
    } catch (err) {
      toast.error((err as { message?: string })?.message || t('staff.locations.deleteFailed'));
    } finally {
      setPendingDelete(null);
    }
  };

  const addButton = (
    <Button type="button" onClick={openCreate}>
      <Plus aria-hidden="true" />
      {t('staff.locations.add')}
    </Button>
  );

  return (
    <SettingsPage
      title={t('staff.settings.location.title')}
      description={t('staff.settings.location.description')}
      actions={locations.length > 0 ? addButton : undefined}
    >
      <div className="space-y-6">
        <SettingsSection title={t('staff.locations.listTitle')} description={t('staff.locations.about')}>
          <LocationList
            isLoading={isLoading}
            error={error}
            locations={locations}
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
        providers={optionsData?.message?.providers || []}
        services={optionsData?.message?.services || []}
        onCreated={() => mutate()}
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
  deleting: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

function LocationList({ isLoading, error, locations, deleting, onRetry, onCreate, onEdit, onDelete }: LocationListProps) {
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
  if (locations.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t('staff.locations.emptyTitle')}
        description={t('staff.locations.emptyDescription')}
        action={
          <Button type="button" onClick={onCreate}>
            <Plus aria-hidden="true" />
            {t('staff.locations.addFirst')}
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {locations.map((location) => (
        <li key={location.name} className="min-w-0">
          <LocationCard location={location} deleting={deleting} onEdit={onEdit} onDelete={onDelete} />
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
