import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import {
  convertScheduleToOpeningHours,
  getDefaultSchedule,
  toEditorSchedule,
  type AvailabilityData,
  type AvailabilityLevel,
  type DaySchedule,
} from '../lib/schedule';
import { activeLocationId, type AvailabilityScope } from './use-availability-scope';

const STATIC_QUERY = { revalidateOnFocus: false, revalidateOnReconnect: false };

/** Loads the three availability levels, keeps editable copies and saves the active one. */
export function useAvailabilitySchedules(scope: AvailabilityScope) {
  const { activeTab, selectedService, selectedProvider, selectedLocation } = scope;
  const locationId = activeLocationId(scope);

  const location = useLevel(
    locationId ? { level: 'location', id: locationId } : undefined,
    `location-availability-${locationId || 'none'}`
  );
  const service = useLevel(
    selectedService ? { level: 'service', id: selectedService } : undefined,
    `service-availability-${selectedService}`
  );
  const provider = useLevel(
    selectedService && selectedProvider
      ? { level: 'provider', service_id: selectedService, location_id: selectedLocation, provider_id: selectedProvider }
      : undefined,
    `provider-availability-${selectedService || 'none'}-${selectedProvider || 'none'}-${selectedLocation || 'none'}`
  );
  const levels = { location, service, provider };
  const current = levels[activeTab];

  const [saving, setSaving] = useState(false);
  const { call: saveAvailability, loading: savingAvailability } = useFrappePostCall('appointment.onboarding.save_availability');

  const handleSave = async () => {
    setSaving(true);
    try {
      const level: AvailabilityLevel = activeTab;
      const id = activeTab === 'location' ? selectedLocation : activeTab === 'service' ? selectedService : null;
      await saveAvailability({
        level,
        id,
        opening_hours: convertScheduleToOpeningHours(current.schedule),
        use_default_hours: current.useDefault ? 1 : 0,
        provider_id: activeTab === 'provider' ? selectedProvider : undefined,
      });
      toast.success('Availability saved successfully!', {
        description: `${level.charAt(0).toUpperCase() + level.slice(1)} availability has been updated.`,
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to save availability', { description: (error as Error)?.message || 'Please try again.', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  return {
    schedule: current.schedule,
    useDefault: current.useDefault,
    setSchedule: current.setSchedule,
    setUseDefault: current.setUseDefault,
    providerRecord: provider.data?.provider,
    parentSchedule: parentScheduleFor(activeTab, location.data, service.data),
    loading: location.isLoading || service.isLoading || provider.isLoading,
    saving: saving || savingAvailability,
    handleSave,
  };
}

/** Service edits within location hours; provider within service hours, falling back to location. */
function parentScheduleFor(tab: AvailabilityLevel, location?: AvailabilityData, service?: AvailabilityData) {
  if (tab === 'service') return location?.schedule;
  if (tab === 'provider') return service?.schedule ?? location?.schedule;
  return undefined;
}

function useLevel(params: Record<string, string | null> | undefined, cacheKey: string) {
  const { data, isLoading } = useFrappeGetCall<{ message: AvailabilityData }>(
    'appointment.onboarding.get_availability',
    params,
    cacheKey,
    STATIC_QUERY
  );
  const [schedule, setSchedule] = useState<DaySchedule[]>(getDefaultSchedule);
  const [useDefault, setUseDefault] = useState(true);

  useEffect(() => {
    if (data?.message) {
      setSchedule(toEditorSchedule(data.message.schedule));
      setUseDefault(data.message.use_default_hours);
    }
  }, [data]);

  return { data: data?.message, isLoading, schedule, setSchedule, useDefault, setUseDefault };
}
