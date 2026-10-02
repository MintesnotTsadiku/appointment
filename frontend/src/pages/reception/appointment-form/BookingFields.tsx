import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n';
import { NotesField, OptionField, TextField } from './fields';
import type { BookingDraft, FieldErrors } from './model';
import { ScheduleFields } from './ScheduleFields';
import { useDeskOptions } from './useDeskOptions';

interface BookingFieldsProps {
  idPrefix: string;
  /** data-qa prefix for the time picker. */
  timeQaPrefix: string;
  freeTime?: boolean;
  draft: BookingDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<BookingDraft>) => void;
  /** Applied to the email as it is typed (edit normalizes stored addresses). */
  formatEmail?: (value: string) => string;
  /** Rendered between the schedule row and notes (e.g. the status field). */
  extra?: ReactNode;
}

/** Client, assignment, schedule and notes sections of the desk booking form. */
export function BookingFields({ idPrefix, timeQaPrefix, freeTime, draft, errors, onChange, formatEmail, extra }: BookingFieldsProps) {
  const { t } = useTranslation();
  const { services, providers, locations } = useDeskOptions();
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <>
      <Section title={t('staff.receptionDesk.client')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField id={id('client-name')} label={t('staff.receptionDesk.clientName')} required autoComplete="off" value={draft.client_name} error={errors.client_name} onValueChange={(client_name) => onChange({ client_name })} />
          <TextField id={id('client-phone')} label={t('staff.receptionDesk.phone')} required type="tel" placeholder="+251 9XX XXX XXX" value={draft.client_phone} error={errors.client_phone} onValueChange={(client_phone) => onChange({ client_phone })} />
        </div>
        <TextField
          id={id('client-email')}
          label={t('staff.receptionDesk.email')}
          type="email"
          placeholder="name@example.com"
          value={draft.client_email}
          error={errors.client_email}
          onValueChange={(value) => onChange({ client_email: value && formatEmail ? formatEmail(value) : value })}
        />
      </Section>

      <Section title={t('staff.receptionDesk.booking')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <OptionField id={id('service')} label={t('staff.receptionDesk.service')} required placeholder={t('staff.receptionDesk.selectService')} value={draft.service_name} options={services} optionLabel={(s) => s.service_name} error={errors.service_name} onValueChange={(service_name) => onChange({ service_name })} />
          <OptionField id={id('provider')} label={t('staff.reception.provider')} required placeholder={t('staff.receptionDesk.selectProvider')} value={draft.provider_name} options={providers} optionLabel={(p) => p.provider_name} error={errors.provider_name} onValueChange={(provider_name) => onChange({ provider_name })} />
          <OptionField id={id('location')} label={t('staff.receptionDesk.location')} required placeholder={t('staff.receptionDesk.selectLocation')} value={draft.location_name} options={locations} optionLabel={(l) => l.location_name} error={errors.location_name} onValueChange={(location_name) => onChange({ location_name })} />
        </div>
        <ScheduleFields idPrefix={idPrefix} qaPrefix={timeQaPrefix} date={draft.appointment_date} startTime={draft.start_time} duration={draft.duration} onChange={onChange} freeTime={freeTime} />
        {extra}
      </Section>

      <NotesField id={id('notes')} label={t('staff.receptionDesk.notes')} placeholder={t('staff.receptionDesk.notesPlaceholder')} value={draft.notes} onValueChange={(notes) => onChange({ notes })} />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-3 text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}
