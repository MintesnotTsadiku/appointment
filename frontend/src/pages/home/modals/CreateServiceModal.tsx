import { Loader2, Plus } from 'lucide-react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Alert, AlertDescription } from '@/components/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { ListSkeleton } from '@/components/states';
import { useCreateServiceForm, type ServiceFormOptions } from './create-service/useCreateServiceForm';
import { ServiceBasicsFields, ServiceScopeFields } from './create-service/CreateServiceFields';

interface CreateServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateServiceModal = ({ open, onOpenChange, onSuccess }: CreateServiceModalProps) => {
  const { t } = useTranslation();
  const { data: formData, isLoading: loadingFormData } = useFrappeGetCall<{ message: ServiceFormOptions }>(
    'appointment.onboarding.get_service_form_data',
    undefined,
    'service-form-data',
    { revalidateOnFocus: false }
  );
  const options = formData?.message;
  const form = useCreateServiceForm(options, {
    name: t('staff.services.errName'),
    duration: t('staff.services.minDuration'),
    location: t('staff.services.errLocation'),
    providers: t('staff.services.errProviders'),
  });
  const { call, loading } = useFrappePostCall('appointment.onboarding.create_service');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    const { values, selectedProviders } = form;
    try {
      await call({
        name: values.serviceName,
        duration: parseInt(values.duration),
        buffer_time: parseInt(values.buffer) || 0,
        price: parseFloat(values.price) || 0,
        description: values.description || '',
        organization: values.organization || undefined,
        location: values.location,
        selected_providers: values.organization && selectedProviders.length > 0 ? selectedProviders : undefined,
      });
      toast.success('Service created successfully!', {
        description: `${values.serviceName} is now available for booking`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error('Failed to create service', { description: message || 'Please try again.' });
      form.setErrors({ submit: message || 'Failed to create service. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-qa="create-service-modal" className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0">
        <DialogHeader className="border-b p-6 pr-14">
          <DialogTitle className="text-base font-semibold">{t('staff.services.createTitle')}</DialogTitle>
          <DialogDescription>{t('staff.services.createDescription')}</DialogDescription>
        </DialogHeader>

        {loadingFormData ? (
          <div className="p-6">
            <ListSkeleton count={4} />
          </div>
        ) : (
          <form id="create-service-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <ServiceScopeFields form={form} options={options} />
            <ServiceBasicsFields form={form} />
            {form.errors.submit && (
              <Alert variant="destructive">
                <AlertDescription>{form.errors.submit}</AlertDescription>
              </Alert>
            )}
          </form>
        )}

        <DialogFooter className="gap-2 border-t p-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('staff.form.cancel')}
          </Button>
          <Button type="submit" form="create-service-form" disabled={loading || loadingFormData} data-qa="create-service-submit">
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {t('staff.services.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
