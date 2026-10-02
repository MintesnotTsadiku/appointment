import { useNavigate } from 'react-router-dom';
import { ExternalLink, Info, UserPlus, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import type { AvailabilityScope } from '../hooks/use-availability-scope';
import { PickerField } from './picker-field';
import { locationOptions, organizationOptions } from '../lib/options';
import { TimeFormatPicker } from './time-format-picker';
import { UnlinkProviderButton } from './unlink-provider-button';

interface ProviderScopeProps {
  scope: AvailabilityScope;
  providerName?: string;
  timeFormat: ClockFormat;
  onTimeFormatChange: (format: ClockFormat) => void;
  onLinkProviders: () => void;
}

export function ProviderScope({ scope, providerName, timeFormat, onTimeFormatChange, onLinkProviders }: ProviderScopeProps) {
  const { t } = useTranslation();
  const { selectedOrganization, selectedService, serviceProviders } = scope;
  return (
    <div className="space-y-4">
      {scope.organizations.length > 0 && (
        <PickerField
          id="availability-provider-organization"
          label={t('staff.availability.organization')}
          value={selectedOrganization || ''}
          onChange={(value) => scope.setSelectedOrganization(value || null)}
          placeholder={t('staff.availability.chooseOrganization')}
          options={organizationOptions(scope)}
        />
      )}
      {selectedOrganization ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <PickerField
            id="availability-provider-location"
            label={t('staff.availability.location')}
            value={scope.selectedLocation || ''}
            onChange={(value) => scope.setSelectedLocation(value || null)}
            placeholder={t('staff.availability.chooseLocation')}
            options={locationOptions(scope)}
            hint={t('staff.availability.providerLocationHint')}
          />
          <PickerField
            id="availability-provider-service"
            required
            label={t('staff.availability.service')}
            value={selectedService || ''}
            onChange={(value) => scope.setSelectedService(value || null)}
            placeholder={t('staff.availability.chooseService')}
            options={scope.services.map((s) => ({ value: s.name, label: s.service_name }))}
            hint={t('staff.availability.providerServiceHint')}
          />
        </div>
      ) : (
        <Guidance text={t('staff.availability.pickOrganizationFirst')} />
      )}
      {selectedOrganization && !selectedService && <Guidance text={t('staff.availability.pickServiceFirst')} />}
      {selectedService && serviceProviders.length > 0 && <ProviderPicker scope={scope} />}
      {selectedService && serviceProviders.length === 0 && <NoProviders scope={scope} onLinkProviders={onLinkProviders} />}
      {selectedService && scope.selectedProvider && providerName && (
        <>
          <EditingFor scope={scope} providerName={providerName} />
          <TimeFormatPicker value={timeFormat} onChange={onTimeFormatChange} />
        </>
      )}
    </div>
  );
}

function ProviderPicker({ scope }: { scope: AvailabilityScope }) {
  const { t } = useTranslation();
  const count = scope.serviceProviders.length;
  return (
    <PickerField
      id="availability-provider"
      required
      label={t('staff.availability.provider')}
      value={scope.selectedProvider || ''}
      onChange={(value) => scope.setSelectedProvider(value || null)}
      placeholder={t('staff.availability.chooseProvider')}
      options={scope.serviceProviders.map((p) => ({
        value: p.name,
        label: p.is_primary ? `${p.provider_name} (${t('staff.availability.primary')})` : p.provider_name,
      }))}
      hint={`${count} ${count === 1 ? t('staff.availability.providerLinkedOne') : t('staff.availability.providerLinkedMany')}`}
      aside={scope.selectedProvider && scope.selectedService ? <UnlinkProviderButton scope={scope} /> : null}
    />
  );
}

function NoProviders({ scope, onLinkProviders }: { scope: AvailabilityScope; onLinkProviders: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Alert variant="warning">
      <Info aria-hidden="true" />
      <AlertTitle>{t('staff.availability.noProvidersTitle')}</AlertTitle>
      <AlertDescription>
        <p>{t('staff.availability.noProvidersBody')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {scope.selectedOrganization && (
            <Button type="button" size="sm" onClick={onLinkProviders}>
              <UserPlus aria-hidden="true" />
              {t('staff.availability.linkProviders')}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/settings/services/${scope.selectedService}`)}>
            <ExternalLink aria-hidden="true" />
            {t('staff.availability.editService')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function EditingFor({ scope, providerName }: { scope: AvailabilityScope; providerName: string }) {
  const { t } = useTranslation();
  const service = scope.services.find((s) => s.name === scope.selectedService)?.service_name || scope.selectedService;
  const location = scope.selectedLocation
    ? scope.locations.find((l) => l.name === scope.selectedLocation)?.location_name || scope.selectedLocation
    : null;
  return (
    <Alert variant="info" role="status">
      <UserRound aria-hidden="true" />
      <AlertTitle>
        {t('staff.availability.editingFor')} <span className="font-semibold">{providerName}</span>
      </AlertTitle>
      <AlertDescription className="text-xs">
        {t('staff.availability.service')}: {service}
        {location && ` · ${t('staff.availability.location')}: ${location}`}
      </AlertDescription>
    </Alert>
  );
}

function Guidance({ text }: { text: string }) {
  return (
    <Alert variant="info" role="status">
      <Info aria-hidden="true" />
      <AlertDescription className="text-foreground">{text}</AlertDescription>
    </Alert>
  );
}
