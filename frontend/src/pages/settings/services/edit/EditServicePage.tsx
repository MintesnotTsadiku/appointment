import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, SearchX } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { StaffShell } from '@/components/staff-shell';
import { SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { LinkProviderModal } from '../../modals/LinkProviderModal';
import { errorMessage, type ServiceDetails, type ServiceProvider } from '../types';
import { useServiceForm } from './useServiceForm';
import { ServiceDetailsSection, ServicePricingSection } from './ServiceFormSections';
import { ServiceProvidersSection } from './ServiceProvidersSection';
import { ServiceNeedsSection } from './ServiceNeedsSection';
import { RemoveProviderDialog } from './RemoveProviderDialog';

interface ServiceDetailsResponse {
  message: { success: boolean; service: ServiceDetails; providers: ServiceProvider[]; error?: string };
}

const EditService = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Shares the needs section's request: a service booked without staff lists rooms, not providers.
  const { data: needsData } = useFrappeGetCall<{ message: { resource_only: number } }>(
    'appointment.scheduler.resources.get_service_needs', serviceId ? { service: serviceId } : undefined, serviceId ? `service-needs-${serviceId}` : null
  );
  const resourceOnly = needsData?.message?.resource_only === 1;
  const [linkProviderModalOpen, setLinkProviderModalOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<ServiceProvider | null>(null);

  const { data, isLoading, error, mutate: refreshService } = useFrappeGetCall<ServiceDetailsResponse>(
    'appointment.onboarding.get_service_details',
    serviceId ? { service_id: serviceId } : undefined,
    `service-details-${serviceId}`,
    { revalidateOnFocus: false }
  );
  const { call: updateService, loading: updating } = useFrappePostCall('appointment.onboarding.create_service');
  const { call: removeProvider, loading: removingProvider } = useFrappePostCall('appointment.onboarding.remove_provider_from_service');

  const service = data?.message?.service;
  const providers = data?.message?.providers || [];
  const form = useServiceForm(service, { required: t('staff.form.required'), minDuration: t('staff.services.minDuration') });

  const crumbs = [
    { label: t('staff.nav.settings'), to: '/settings' },
    { label: t('staff.settings.services.title'), to: '/settings/services' },
  ];

  if (isLoading) {
    return (
      <StaffShell title={t('staff.services.editTitle')} breadcrumbs={[...crumbs, { label: t('staff.states.loading') }]} width="default">
        <PageSkeleton rows={2} />
      </StaffShell>
    );
  }

  if (!service) {
    return (
      <StaffShell title={t('staff.services.editTitle')} breadcrumbs={crumbs} width="default">
        {error ? (
          <ErrorState onRetry={() => refreshService()} />
        ) : (
          <EmptyState
            icon={SearchX}
            title="Service not found"
            action={
              <Button variant="outline" onClick={() => navigate('/settings/services')}>
                {t('staff.services.backToServices')}
              </Button>
            }
          />
        )}
      </StaffShell>
    );
  }

  const handleSave = async () => {
    if (!serviceId || !form.validate()) return;
    const { values } = form;
    try {
      // The create endpoint upserts; resend current provider links so they are kept.
      const selectedProviders = providers.map((p) => ({
        provider: p.name,
        is_primary: p.is_primary,
        price_override: p.price_override,
        duration_override: p.duration_override,
        commission_rate: p.commission_rate,
        notes: p.notes,
      }));
      await updateService({
        name: values.serviceName,
        duration: parseInt(values.duration),
        buffer_time: parseInt(values.buffer),
        price: parseFloat(values.price),
        currency: service.currency,
        organization: service.organization,
        selected_providers: selectedProviders,
        description: values.description,
      });
      refreshService();
      navigate('/settings/services');
    } catch (err) {
      toast.error(errorMessage(err, t('staff.services.updateFailed')));
    }
  };

  const confirmRemoveProvider = async () => {
    if (!serviceId || !pendingRemoval) return;
    try {
      await removeProvider({ service_id: serviceId, provider_id: pendingRemoval.name });
      setPendingRemoval(null);
      refreshService();
    } catch (err) {
      toast.error(errorMessage(err, t('staff.services.removeFailed')));
    }
  };

  return (
    <StaffShell
      title={service.service_name}
      eyebrow={t('staff.services.editTitle')}
      breadcrumbs={[...crumbs, { label: service.service_name }]}
      headingQa="edit-service-heading"
      width="default"
    >
      <div className="space-y-6">
        <ServiceDetailsSection values={form.values} errors={form.errors} setField={form.setField} />
        <ServicePricingSection values={form.values} errors={form.errors} setField={form.setField} />
        {resourceOnly ? (
          <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground" data-qa="service-providers-hidden">{t('staff.resources.providersHidden')}</p>
        ) : (
          <ServiceProvidersSection
            providers={providers}
            canLink={!!service.organization}
            removingId={removingProvider && pendingRemoval ? pendingRemoval.name : null}
            onLink={() => setLinkProviderModalOpen(true)}
            onRemove={setPendingRemoval}
          />
        )}
        {serviceId && <ServiceNeedsSection serviceId={serviceId} />}
        <PoliciesPointer />
      </div>

      <StickySaveBar dirty={form.dirty} saving={updating} onSave={handleSave} onDiscard={form.reset} saveQa="edit-service-save" />

      <RemoveProviderDialog
        provider={pendingRemoval}
        removing={removingProvider}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoveProvider}
      />

      {service.organization && (
        <LinkProviderModal
          open={linkProviderModalOpen}
          onOpenChange={setLinkProviderModalOpen}
          serviceId={serviceId || ''}
          serviceName={service.service_name}
          organizationId={service.organization}
          onSuccess={() => refreshService()}
        />
      )}
    </StaffShell>
  );
};

/** Policies are scoped to a provider or organization, so they are edited from the profile page. */
function PoliciesPointer() {
  const { t } = useTranslation();
  return (
    <SettingsSection id="service-policies" title={t('staff.services.policiesTitle')} description={t('staff.services.policiesDescription')}>
      <Button asChild variant="outline" size="sm">
        <Link to="/settings/profile?tab=policies">
          {t('staff.services.managePolicies')}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </SettingsSection>
  );
}

export default EditService;
