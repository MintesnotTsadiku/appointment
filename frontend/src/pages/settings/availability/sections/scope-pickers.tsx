import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import type { AvailabilityScope } from '../hooks/use-availability-scope';
import { locationOptions, organizationOptions } from '../lib/options';
import { PickerField } from './picker-field';
import { TimeFormatPicker } from './time-format-picker';

interface ScopeProps {
  scope: AvailabilityScope;
  timeFormat: ClockFormat;
  onTimeFormatChange: (format: ClockFormat) => void;
}

export function LocationScope({ scope, timeFormat, onTimeFormatChange }: ScopeProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <PickerField
        id="availability-location"
        qa="availability-location-select"
        label={t('staff.availability.location')}
        value={scope.selectedLocation || ''}
        onChange={(value) => scope.setSelectedLocation(value)}
        placeholder={t('staff.availability.selectPlaceholder')}
        options={locationOptions(scope)}
      />
      <TimeFormatPicker value={timeFormat} onChange={onTimeFormatChange} />
    </div>
  );
}

export function ServiceScope({ scope, timeFormat, onTimeFormatChange }: ScopeProps) {
  const { t } = useTranslation();
  const { locations, services, selectedServiceLocation } = scope;
  return (
    <div className="space-y-4">
      {scope.organizations.length > 0 && (
        <PickerField
          id="availability-service-organization"
          label={t('staff.availability.organization')}
          value={scope.selectedOrganization || ''}
          onChange={(value) => scope.setSelectedOrganization(value || null)}
          placeholder={t('staff.availability.allOrganizations')}
          options={organizationOptions(scope)}
        />
      )}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <PickerField
          id="availability-service-location"
          label={t('staff.availability.location')}
          value={selectedServiceLocation || ''}
          onChange={(value) => scope.setSelectedServiceLocation(value || null)}
          placeholder={locations.length ? t('staff.availability.chooseLocation') : t('staff.availability.noLocations')}
          options={locationOptions(scope)}
          disabled={!locations.length}
          hint={t('staff.availability.serviceLocationHint')}
        />
        <TimeFormatPicker value={timeFormat} onChange={onTimeFormatChange} />
      </div>
      <PickerField
        id="availability-service"
        label={t('staff.availability.service')}
        value={scope.selectedService || ''}
        onChange={(value) => scope.setSelectedService(value || null)}
        placeholder={selectedServiceLocation ? t('staff.availability.chooseService') : t('staff.availability.pickLocationFirst')}
        options={services.map((s) => ({ value: s.name, label: s.service_name }))}
        disabled={!selectedServiceLocation || services.length === 0}
        hint={t('staff.availability.serviceHint')}
      />
    </div>
  );
}
