import { useEffect, useState, type FormEvent } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { OptionSelect } from '@/components/select/OptionSelect';
import { intlLocale, useTranslation } from '@/lib/i18n';
import type { Appointment } from '../types';
import { BookingFields } from '../appointment-form/BookingFields';
import { Field } from '../appointment-form/fields';
import { FormDialog } from '../appointment-form/FormDialog';
import { MeetingLinkSection } from './MeetingLinkSection';
import { normalizePhone, phoneList } from '@/lib/phone';
import { normalizeEmail, scheduleWindow, validateBooking, type BookingDraft, type FieldErrors } from '../appointment-form/model';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

type EditDraft = BookingDraft & { status: string };

const STATUSES = [
  ['Pending', 'staff.status.pending'],
  ['Confirmed', 'staff.status.confirmed'],
  ['Completed', 'staff.status.completed'],
  ['Cancelled', 'staff.status.cancelled'],
  ['No Show', 'staff.status.noShow'],
] as const;

export const EditAppointmentModal = ({ isOpen, onClose, appointment, onSuccess }: EditAppointmentModalProps) => {
  const { t, language } = useTranslation();
  // A booking without a provider is a resource-only booking; its room stays as it is.
  const resourceOnly = Boolean(appointment && !appointment.provider);
  const [draft, setDraft] = useState<EditDraft>(() => draftFrom(appointment));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [participantsValid, setParticipantsValid] = useState(true);
  const { call: updateAppointment, loading: updating } = useFrappePostCall('appointment.scheduler.api.desk.update_appointment');

  useEffect(() => {
    if (appointment) setDraft(draftFrom(appointment));
  }, [appointment]);

  const change = (patch: Partial<EditDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateBooking(draft, { required: t('staff.form.required'), email: t('staff.receptionDesk.invalidEmail'), phone: t('controls.phone.hint'), phoneRequired: t('controls.phone.required') }, { resourceOnly, resourceFixed: true, savedPhone: appointment.client_phone || '' });
    setErrors(found);
    if (Object.keys(found).length || !participantsValid) return;

    try {
      const { start, endTime } = scheduleWindow(draft.appointment_date, draft.start_time, draft.duration);
      const result = await updateAppointment({
        appointment_name: appointment.name,
        client_name: draft.client_name,
        // An unchanged older number is sent as it was saved; the server leaves it alone.
        client_phone: normalizePhone(draft.client_phone) || draft.client_phone,
        client_email: draft.client_email ? normalizeEmail(draft.client_email) : '',
        participant_phones: (draft.participant_phones || []).join(','),
        service_name: draft.service_name,
        provider_name: draft.provider_name,
        location_name: draft.location_name,
        appointment_date: draft.appointment_date,
        start_time: `${draft.start_time}:00`,
        end_time: endTime,
        status: draft.status,
        notes: draft.notes,
      });

      if (result?.message?.success) {
        toast.success(t('staff.receptionDesk.toast.appointmentUpdated'), { description: t('staff.receptionDesk.toast.updatedFor').replace('{0}', new Intl.DateTimeFormat(intlLocale(language), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(start)) });
        onSuccess();
        onClose();
      } else {
        toast.error(t('staff.receptionDesk.toast.updateFailed'), { description: result?.message?.error });
      }
    } catch (error) {
      toast.error(t('staff.receptionDesk.toast.updateFailed'), { description: (error as { message?: string } | undefined)?.message });
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      qa="edit-appointment-modal"
      title={t('staff.receptionDesk.editTitle')}
      description={t('staff.receptionDesk.editDescription')}
      submitQa="appointment-update-submit"
      submitLabel={t('staff.receptionDesk.editSubmit')}
      pendingLabel={t('staff.receptionDesk.editPending')}
      pending={updating}
      onSubmit={handleSubmit}
    >
      {/* An online booking's private link; it saves on its own, so the dialog stays open. */}
      {Boolean(appointment.is_online) && <MeetingLinkSection appointment={appointment.name} onChanged={() => undefined} />}
      <BookingFields
        idPrefix="edit-appointment"
        timeQaPrefix="edit-time"
        draft={draft}
        errors={errors}
        onChange={change}
        formatEmail={normalizeEmail}
        onParticipantsValid={setParticipantsValid}
        phoneOptional={!appointment.client_phone}
        resourceLabel={resourceOnly ? appointment.resource_names?.join(', ') || '—' : undefined}
        extra={<StatusField value={draft.status} onValueChange={(status) => change({ status })} />}
      />
    </FormDialog>
  );
};

function StatusField({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const { t } = useTranslation();
  const current = (
    <span data-qa="appointment-status-value" className="text-xs font-medium text-muted-foreground">
      {value}
    </span>
  );
  return (
    <Field id="edit-appointment-status" label={t('staff.receptionDesk.status')} aside={current}>
      {/* Stays a native select: QA drives it with a `select` action. */}
      <OptionSelect id="edit-appointment-status" data-qa="appointment-status" value={value} onValueChange={onValueChange}
        options={STATUSES.map(([status, key]) => ({ value: status, label: t(key) }))} />
    </Field>
  );
}

function draftFrom(appointment: Appointment): EditDraft {
  const start = parseISO(`2000-01-01T${appointment.start_time || '09:00:00'}`);
  const end = parseISO(`2000-01-01T${appointment.end_time || '09:30:00'}`);
  return {
    client_name: appointment.client_name || '',
    client_phone: appointment.client_phone || '',
    client_email: appointment.client_email ? normalizeEmail(appointment.client_email) : '',
    participant_phones: phoneList(appointment.participant_phones),
    service_name: appointment.service || '',
    provider_name: appointment.provider || '',
    location_name: appointment.location || '',
    appointment_date: appointment.appointment_date || format(new Date(), 'yyyy-MM-dd'),
    start_time: appointment.start_time?.substring(0, 5) || '09:00',
    duration: Math.round((end.getTime() - start.getTime()) / 60000).toString(),
    status: appointment.status || 'Confirmed',
    notes: appointment.notes || '',
  };
}
