import { Input } from '@/components/input';
import { PhoneInput } from '@/components/phone-input';
import { useTranslation } from '@/lib/i18n';
import { ChoiceSelect, Field, type FieldsProps } from './Field';

const TIMEZONES = ['Africa/Addis_Ababa', 'UTC'];

export function LocationFields({ idPrefix, values, onChange }: FieldsProps) {
  const { t } = useTranslation();
  const id = (field: string) => `${idPrefix}-${field}`;
  const textField = (field: string, label: string, required = false) => (
    <Field id={id(field)} label={label} required={required}>
      <Input id={id(field)} type="text" required={required} value={values[field] ?? ''} onChange={(e) => onChange(field, e.target.value)} />
    </Field>
  );

  return (
    <>
      {textField('location_name', t('staff.manage.form.locationName'), true)}
      {textField('address_line_1', t('staff.manage.form.addressLine1'))}
      {textField('address_line_2', t('staff.manage.form.addressLine2'))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {textField('city', t('staff.manage.form.city'))}
        <Field id={id('phone')} label={t('staff.manage.form.phone')}>
          <PhoneInput id={id('phone')} value={values.phone ?? ''} onChange={(value) => onChange('phone', value)} />
        </Field>
      </div>
      <Field id={id('timezone')} label={t('staff.manage.form.timezone')}>
        <ChoiceSelect id={id('timezone')} value={values.timezone} options={TIMEZONES} onChange={(value) => onChange('timezone', value)} />
      </Field>
    </>
  );
}
