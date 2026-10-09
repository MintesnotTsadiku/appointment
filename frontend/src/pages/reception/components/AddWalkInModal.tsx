import { useState, type FormEvent } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useBusinessKey } from '@/hooks/useBusinessKey';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { CustomerPicker } from '@/pages/customers/CustomerPicker';
import type { CustomerSummary } from '@/pages/customers/types';
import type { Location, Provider, Service } from '../types';
import { NotesField, OptionField, TextField } from '../appointment-form/fields';
import { FormDialog } from '../appointment-form/FormDialog';
import { EMAIL_PATTERN } from '../appointment-form/model';

interface AddWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: Location[];
  providers: Provider[];
}

const EMPTY = {
  client_name: '',
  client_phone: '',
  client_email: '',
  service_requested: '',
  location_name: '',
  provider_preferred: '',
  notes: '',
};

type WalkInDraft = typeof EMPTY;

/** Field ids (#client_email, #service_requested, #location_name, #provider_preferred) are QA selectors. */
export const AddWalkInModal = ({ isOpen, onClose, onSuccess, locations, providers }: AddWalkInModalProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<WalkInDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<WalkInDraft>>({});
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  // An independent provider's key (`Provider:<name>`) puts the walk-in in their own queue.
  const { key: organization, independent } = useBusinessKey();
  const { data: servicesData } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.scheduler.api.desk.get_services_list',
    undefined,
    'services'
  );
  const { call: addWalkIn, loading: creating } = useFrappePostCall('appointment.scheduler.api.desk.add_walk_in');
  const services = servicesData?.message?.services || [];
  const set = (field: keyof WalkInDraft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const found: Partial<WalkInDraft> = {};
    if (!draft.client_name.trim()) found.client_name = t('staff.form.required');
    if (!draft.client_phone.trim()) found.client_phone = t('staff.form.required');
    if (draft.client_email && !EMAIL_PATTERN.test(draft.client_email)) found.client_email = t('staff.receptionDesk.invalidEmail');
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await addWalkIn({
        client_name: draft.client_name,
        client_phone: draft.client_phone,
        client_email: draft.client_email || undefined,
        service_requested: draft.service_requested || undefined,
        location_name: draft.location_name || undefined,
        provider_preferred: draft.provider_preferred || undefined,
        notes: draft.notes || undefined,
        customer: customer?.name,
        ...(independent && organization ? { business: organization } : {}),
      });

      if (result?.message?.success) {
        toast.success(t('staff.receptionDesk.toast.walkInAdded'), { description: t('staff.receptionDesk.toast.walkInAddedHint') });
        onSuccess();
        onClose();
        setDraft(EMPTY);
        setCustomer(null);
      } else {
        toast.error(t('staff.receptionDesk.toast.walkInAddFailed'), { description: result?.message?.error });
      }
    } catch (error) {
      toast.error(t('staff.receptionDesk.toast.walkInAddFailed'), { description: serverErrorMessage(error) || undefined });
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      qa="walkin-modal"
      className="max-w-lg"
      title={t('staff.receptionDesk.walkInTitle')}
      description={t('staff.receptionDesk.walkInDescription')}
      submitQa="walkin-submit"
      submitLabel={t('staff.receptionDesk.walkInSubmit')}
      pendingLabel={t('staff.receptionDesk.walkInPending')}
      pending={creating}
      onSubmit={handleSubmit}
    >
      <CustomerPicker
        organization={organization}
        value={customer}
        qa="walkin-customer-picker"
        onChange={(picked) => {
          setCustomer(picked);
          if (picked) {
            setDraft((current) => ({
              ...current,
              client_name: picked.display_name,
              client_phone: picked.primary_phone ?? current.client_phone,
              client_email: picked.primary_email ?? '',
            }));
          }
        }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="client_name" data-qa="walkin-client-name" label={t('staff.receptionDesk.clientName')} required autoComplete="off" value={draft.client_name} error={errors.client_name} onValueChange={set('client_name')} />
        <TextField id="client_phone" data-qa="walkin-client-phone" label={t('staff.receptionDesk.phone')} required type="tel" placeholder="+251 9XX" value={draft.client_phone} error={errors.client_phone} onValueChange={set('client_phone')} />
      </div>
      <TextField id="client_email" label={t('staff.receptionDesk.email')} type="email" placeholder="name@example.com" value={draft.client_email} error={errors.client_email} onValueChange={set('client_email')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OptionField id="service_requested" label={t('staff.receptionDesk.service')} placeholder={t('staff.receptionDesk.selectService')} value={draft.service_requested} options={services} optionLabel={(s) => s.service_name} onValueChange={set('service_requested')} />
        <OptionField id="location_name" label={t('staff.receptionDesk.location')} placeholder={t('staff.receptionDesk.selectLocation')} value={draft.location_name} options={locations} optionLabel={(l) => l.location_name} onValueChange={set('location_name')} />
      </div>
      <OptionField id="provider_preferred" label={t('staff.receptionDesk.preferredProvider')} placeholder={t('staff.receptionDesk.selectProvider')} value={draft.provider_preferred} options={providers} optionLabel={(p) => p.provider_name} onValueChange={set('provider_preferred')} />
      <NotesField id="walkin-notes" label={t('staff.receptionDesk.notes')} rows={2} placeholder={t('staff.receptionDesk.walkInNotesPlaceholder')} value={draft.notes} onValueChange={set('notes')} />
    </FormDialog>
  );
};
