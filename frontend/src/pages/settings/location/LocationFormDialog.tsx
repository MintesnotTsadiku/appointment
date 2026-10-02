import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { useTranslation } from '@/lib/i18n';
import { LocationFields } from './LocationFields';
import {
  emptyLocationForm,
  formFromLocation,
  validateLocation,
  type Location,
  type LocationErrors,
  type LocationFormData,
  type ProviderOption,
  type ServiceOption,
} from './types';

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation: Location | null;
  providers: ProviderOption[];
  services: ServiceOption[];
  onCreated: () => void;
}

export function LocationFormDialog({ open, onOpenChange, editingLocation, providers, services, onCreated }: LocationFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LocationFormData>(emptyLocationForm());
  const [errors, setErrors] = useState<LocationErrors>({});
  const { call: createLocation, loading: creating } = useFrappePostCall('appointment.onboarding.create_location');

  // Reset whenever the dialog opens; the first provider is usually the signed-in user's own.
  useEffect(() => {
    if (!open) return;
    setForm(editingLocation ? formFromLocation(editingLocation) : emptyLocationForm(providers[0]?.name ?? ''));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingLocation]);

  const update = (patch: Partial<LocationFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    const cleared = Object.keys(patch).filter((key) => errors[key as keyof LocationErrors]);
    if (cleared.length) setErrors((prev) => ({ ...prev, ...Object.fromEntries(cleared.map((key) => [key, ''])) }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateLocation(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      if (editingLocation) {
        // No update_location API exists yet.
        toast.info(t('staff.locations.updateSoon'));
        return;
      }
      await createLocation({
        location_name: form.location_name,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2,
        city: form.city,
        phone: form.phone,
        timezone: form.timezone,
        provider_id: form.provider_id || undefined,
        service_ids: form.service_ids.length > 0 ? form.service_ids : undefined,
      });
      toast.success(t('staff.locations.created'));
      onCreated();
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: (error as { message?: string })?.message || t('staff.locations.saveFailed') });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{t(editingLocation ? 'staff.locations.editTitle' : 'staff.locations.createTitle')}</DialogTitle>
          <DialogDescription>{t(editingLocation ? 'staff.locations.editDescription' : 'staff.locations.createDescription')}</DialogDescription>
        </DialogHeader>

        <form
          id="location-form"
          className="mt-2 space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <LocationFields
            form={form}
            errors={errors}
            onChange={update}
            providers={!editingLocation && providers.length > 1 ? providers : []}
            services={!editingLocation ? services : []}
          />
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="mt-6 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            {t('staff.form.cancel')}
          </Button>
          <Button type="submit" form="location-form" disabled={creating}>
            {creating && <Loader2 className="animate-spin" aria-hidden="true" />}
            {creating ? t('staff.form.saving') : t(editingLocation ? 'staff.locations.update' : 'staff.locations.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
