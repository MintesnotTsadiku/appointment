import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { SettingsPage, SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { EmptyState, ErrorState } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { LinkProviderModal } from '../modals/LinkProviderModal';
import { useAvailabilitySchedules } from './hooks/use-availability-schedules';
import { useAvailabilityScope, type AvailabilityScope } from './hooks/use-availability-scope';
import { EditorSkeleton, PageBodySkeleton } from './sections/availability-skeleton';
import { ProviderScope } from './sections/provider-scope';
import { ScheduleTemplates } from './sections/schedule-templates';
import { LocationScope, ServiceScope } from './sections/scope-pickers';
import { ScopeTabs } from './sections/scope-tabs';
import { AvailabilityTips } from './sections/tips';
import { WeeklyEditor } from './sections/weekly-editor';

const AvailabilitySettings = () => {
  const { t } = useTranslation();
  const scope = useAvailabilityScope();
  const schedules = useAvailabilitySchedules(scope);
  const [timeFormat, setTimeFormat] = useState<ClockFormat>('12h');
  const [linkProviderModalOpen, setLinkProviderModalOpen] = useState(false);
  const { activeTab, selectedService, selectedOrganization } = scope;
  const providerName = providerNameFor(scope, schedules.providerRecord);
  const serviceName = scope.services.find((s) => s.name === selectedService)?.service_name;

  return (
    <SettingsPage
      title={t('staff.settings.availability.title')}
      description={t('staff.availability.pageDescription')}
    >
      {scope.error ? (
        <ErrorState onRetry={scope.retry} />
      ) : scope.loadingProgress ? (
        <PageBodySkeleton />
      ) : (
        <>
          <ScopeTabs value={activeTab} onChange={scope.setActiveTab}>
            <SettingsSection title={t('staff.availability.scopeTitle')} description={t(`staff.availability.scopeDescription.${activeTab}`)}>
              {activeTab === 'location' && <LocationScope scope={scope} timeFormat={timeFormat} onTimeFormatChange={setTimeFormat} />}
              {activeTab === 'service' && <ServiceScope scope={scope} timeFormat={timeFormat} onTimeFormatChange={setTimeFormat} />}
              {activeTab === 'provider' && (
                <ProviderScope
                  scope={scope}
                  providerName={providerName}
                  timeFormat={timeFormat}
                  onTimeFormatChange={setTimeFormat}
                  onLinkProviders={() => setLinkProviderModalOpen(true)}
                />
              )}
            </SettingsSection>
            {schedules.loading ? (
              <EditorSkeleton />
            ) : isEditorReady(scope, providerName) ? (
              <>
                <ScheduleTemplates
                  key={activeTab}
                  level={activeTab}
                  schedule={schedules.schedule}
                  onChange={schedules.setSchedule}
                  onUseDefaultChange={schedules.setUseDefault}
                  parentSchedule={schedules.parentSchedule}
                  serviceName={serviceName}
                  locationName={locationNameFor(scope)}
                  timeFormat={timeFormat}
                />
                <WeeklyEditor
                  schedule={schedules.schedule}
                  onChange={schedules.setSchedule}
                  useDefaultHours={schedules.useDefault}
                  onUseDefaultChange={activeTab === 'location' ? undefined : schedules.setUseDefault}
                  parentSchedule={schedules.parentSchedule}
                  level={activeTab}
                  timeFormat={timeFormat}
                />
                <AvailabilityTips level={activeTab} />
              </>
            ) : activeTab !== 'provider' ? (
              <EmptyState
                icon={CalendarClock}
                title={activeTab === 'location' ? t('staff.availability.emptyLocation') : t('staff.availability.emptyService')}
                description={t('staff.availability.emptyDescription')}
              />
            ) : null}
          </ScopeTabs>
          <StickySaveBar
            onSave={schedules.handleSave}
            saving={schedules.saving}
            saveQa="availability-save"
            message={t(`staff.availability.saveMessage.${activeTab}`)}
          />
        </>
      )}

      {selectedService && selectedOrganization && (
        <LinkProviderModal
          open={linkProviderModalOpen}
          onOpenChange={setLinkProviderModalOpen}
          serviceId={selectedService}
          serviceName={serviceName || 'Service'}
          organizationId={selectedOrganization}
          onSuccess={() => {
            scope.refreshServiceProviders();
            // Auto-select once the refreshed provider list arrives.
            setTimeout(() => {
              if (!scope.selectedProvider && scope.serviceProviders.length > 0) {
                scope.setSelectedProvider(scope.serviceProviders[0].name);
              }
            }, 500);
          }}
        />
      )}
    </SettingsPage>
  );
};

export default AvailabilitySettings;

function providerNameFor(scope: AvailabilityScope, record?: { provider_name: string } | null) {
  if (record) return record.provider_name;
  if (!scope.selectedProvider) return undefined;
  return scope.serviceProviders.find((p) => p.name === scope.selectedProvider)?.provider_name;
}

function locationNameFor(scope: AvailabilityScope) {
  const id = scope.activeTab === 'service' ? scope.selectedServiceLocation : scope.selectedLocation;
  return scope.locations.find((l) => l.name === id)?.location_name;
}

function isEditorReady(scope: AvailabilityScope, providerName?: string) {
  if (scope.activeTab === 'location') return !!scope.selectedLocation;
  if (scope.activeTab === 'service') return !!scope.selectedService;
  return !!(scope.selectedService && scope.selectedProvider && providerName);
}
