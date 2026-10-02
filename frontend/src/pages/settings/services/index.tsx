import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Plus } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { SettingsPage } from '@/components/settings-layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { CreateServiceModal } from '@/pages/home/modals/CreateServiceModal';
import { ServicesTable } from './ServicesTable';
import { DeleteServiceDialog } from './DeleteServiceDialog';
import { errorMessage, type Service } from './types';

const ServicesSettings = () => {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.onboarding.get_provider_services',
    undefined,
    'provider-services'
  );
  const { call: deleteService, loading: deleting } = useFrappePostCall('appointment.onboarding.delete_service');

  const services = data?.message?.services || [];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteService({ service_name: pendingDelete.service_name });
      setPendingDelete(null);
      mutate();
    } catch (err) {
      toast.error(errorMessage(err, t('staff.services.deleteFailed')));
    }
  };

  const openCreate = () => setShowCreateModal(true);

  return (
    <SettingsPage
      title={t('staff.services.title')}
      crumb={t('staff.settings.services.title')}
      headingQa="services-heading"
      description={t('staff.services.description')}
      actions={
        <Button data-qa="services-new" onClick={openCreate}>
          <Plus aria-hidden="true" />
          {t('staff.services.new')}
        </Button>
      }
    >
      <div className="space-y-6">
        <ServicesBody
          loading={isLoading}
          failed={!!error && !data}
          services={services}
          deleting={deleting}
          onRetry={() => mutate()}
          onCreate={openCreate}
          onDelete={setPendingDelete}
        />
        {services.length > 0 && <NextSteps />}
      </div>

      <DeleteServiceDialog
        service={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <CreateServiceModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={() => mutate()} />
    </SettingsPage>
  );
};

interface ServicesBodyProps {
  loading: boolean;
  failed: boolean;
  services: Service[];
  deleting: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onDelete: (service: Service) => void;
}

function ServicesBody({ loading, failed, services, deleting, onRetry, onCreate, onDelete }: ServicesBodyProps) {
  const { t } = useTranslation();
  if (loading) return <ListSkeleton count={4} />;
  if (failed) return <ErrorState onRetry={onRetry} />;
  if (services.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title={t('staff.services.emptyTitle')}
        description={t('staff.services.emptyDescription')}
        action={
          <Button onClick={onCreate}>
            <Plus aria-hidden="true" />
            {t('staff.services.createFirst')}
          </Button>
        }
      />
    );
  }
  return <ServicesTable services={services} deleting={deleting} onDelete={onDelete} />;
}

/** Follow-up settings most people need after adding a service. */
function NextSteps() {
  const { t } = useTranslation();
  const links = [
    { to: '/settings/availability', title: t('staff.services.nextAvailability'), body: t('staff.services.nextAvailabilityBody') },
    { to: '/settings/location', title: t('staff.services.nextLocation'), body: t('staff.services.nextLocationBody') },
  ];
  return (
    <section aria-labelledby="services-next-steps" className="space-y-3">
      <h2 id="services-next-steps" className="text-base font-semibold text-foreground">
        {t('staff.services.nextSteps')}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group flex h-full items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-card outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{link.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{link.body}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ServicesSettings;
