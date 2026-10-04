import { useEffect, useState, type FormEvent } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { CustomerPicker } from '@/pages/customers/CustomerPicker';
import type { CustomerSummary } from '@/pages/customers/types';
import { BookingFields } from '../appointment-form/BookingFields';
import { FormDialog } from '../appointment-form/FormDialog';
import { useDeskOptions } from '../appointment-form/useDeskOptions';
import { scheduleWindow, validateBooking, type BookingDraft, type FieldErrors } from '../appointment-form/model';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  defaultProvider?: string;
  defaultLocation?: string;
}

export const CreateAppointmentModal = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  defaultTime,
  defaultProvider,
  defaultLocation,
}: CreateAppointmentModalProps) => {
  const { t } = useTranslation();
  const { services } = useDeskOptions();
  const [draft, setDraft] = useState<BookingDraft>({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_name: '',
    provider_name: defaultProvider || '',
    location_name: defaultLocation || '',
    appointment_date: format(defaultDate || new Date(), 'yyyy-MM-dd'),
    start_time: defaultTime || '09:00',
    duration: '30',
    notes: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const organization = useSession().session?.selected?.organization;
  const { call: createAppointment, loading: creating } = useFrappePostCall('appointment.scheduler.api.desk.create_desk_appointment');

  // Follow the slot/filters the desk opened the dialog with.
  useEffect(() => {
    if (!isOpen) return;
    setDraft((prev) => ({
      ...prev,
      appointment_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : prev.appointment_date,
      start_time: defaultTime || prev.start_time,
      provider_name: defaultProvider || prev.provider_name,
      location_name: defaultLocation || prev.location_name,
    }));
  }, [isOpen, defaultDate, defaultTime, defaultProvider, defaultLocation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const resourceOnly = Boolean(services.find((service) => service.name === draft.service_name)?.resource_only);
    const found = validateBooking(draft, { required: t('staff.form.required'), email: t('staff.receptionDesk.invalidEmail') }, { resourceOnly });
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      const { start, endTime } = scheduleWindow(draft.appointment_date, draft.start_time, draft.duration);
      const result = await createAppointment({
        client_name: draft.client_name,
        client_phone: draft.client_phone,
        client_email: draft.client_email,
        service_name: draft.service_name,
        provider_name: draft.provider_name,
        location_name: draft.location_name,
        appointment_date: draft.appointment_date,
        start_time: `${draft.start_time}:00`,
        end_time: endTime,
        notes: draft.notes,
        customer: customer?.name,
        resource_name: resourceOnly ? draft.resource_name : undefined,
        quantity: Math.max(1, Number(draft.quantity) || 1),
      });

      if (result?.message?.success) {
        toast.success('Appointment created!', { description: `Scheduled for ${format(start, 'MMM d, h:mm a')}` });
        onSuccess();
        onClose();
      } else {
        toast.error('Creation failed', { description: result?.message?.error });
      }
    } catch (error) {
      toast.error('Creation failed', { description: serverErrorMessage(error) || undefined });
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      qa="create-appointment-modal"
      title={t('staff.receptionDesk.createTitle')}
      description={t('staff.receptionDesk.createDescription')}
      submitQa="appointment-create-submit"
      submitLabel={t('staff.receptionDesk.createSubmit')}
      pendingLabel={t('staff.receptionDesk.createPending')}
      pending={creating}
      onSubmit={handleSubmit}
    >
      <BookingFields
        idPrefix="create-appointment"
        timeQaPrefix="create-time"
        freeTime
        draft={draft}
        errors={errors}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        customerSlot={
          <CustomerPicker
            organization={organization}
            value={customer}
            qa="create-customer-picker"
            hint={t('staff.customers.pickerHint')}
            onChange={(picked) => {
              setCustomer(picked);
              if (picked) {
                setDraft((current) => ({
                  ...current,
                  client_name: picked.display_name,
                  client_phone: picked.primary_phone ?? '',
                  client_email: picked.primary_email ?? '',
                }));
              }
            }}
          />
        }
      />
    </FormDialog>
  );
};
