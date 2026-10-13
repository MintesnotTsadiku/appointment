import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { LocationFields } from './LocationFields';
import {
  LOCATIONS_API,
  emptyLocationForm,
  formFromLocation,
  payloadFor,
  validateLocation,
  type Location,
  type LocationErrors,
  type LocationFormData,
  type LocationKind,
  type Owner,
  type SessionOption,
} from './types';

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation: Location | null;
  /** The type a new place starts with, for example from "Add an online location". */
  startKind?: LocationKind;
  owners: Owner[];
  platforms: string[];
  sessions: SessionOption[];
  onSaved: () => void;
}

export function LocationFormDialog({ open, onOpenChange, editingLocation, startKind = 'In person', owners, platforms, sessions, onSaved }: LocationFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LocationFormData>(emptyLocationForm());
  const [errors, setErrors] = useState<LocationErrors>({});
  const { call: save, loading: saving } = useFrappePostCall(`${LOCATIONS_API}.save`);

  useEffect(() => {
    if (!open) return;
    setForm(editingLocation ? formFromLocation(editingLocation) : emptyLocationForm(owners[0]?.key ?? '', startKind));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingLocation, startKind]);

  const update = (patch: Partial<LocationFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    const cleared = Object.keys(patch).filter((key) => errors[key as keyof LocationErrors]);
    if (cleared.length) setErrors((prev) => ({ ...prev, ...Object.fromEntries(cleared.map((key) => [key, ''])) }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateLocation(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    try {
      await save(payloadFor(form, editingLocation?.name));
      toast.success(t(editingLocation ? 'staff.locations.updated' : 'staff.locations.created'));
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: serverErrorMessage(error) || t('staff.locations.saveFailed') });
    }
  };

  // A new place of an independent business can offer its sessions; an edit keeps them as they are.
  const offered = editingLocation ? [] : sessions.filter((session) => session.owner === form.owner);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-qa="location-dialog" className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-6">
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
          <LocationFields form={form} errors={errors} onChange={update} owners={editingLocation ? [] : owners} platforms={platforms} sessions={offered} />
          {errors.submit && (
            <Alert variant="destructive" data-qa="location-error">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="mt-6 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('staff.form.cancel')}
          </Button>
          <Button type="submit" form="location-form" disabled={saving} data-qa="location-save">
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {saving ? t('staff.form.saving') : t(editingLocation ? 'staff.locations.update' : 'staff.locations.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
