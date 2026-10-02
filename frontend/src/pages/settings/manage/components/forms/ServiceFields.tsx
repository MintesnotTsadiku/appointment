import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { useTranslation } from '@/lib/i18n';
import { ChoiceSelect, Field, type FieldsProps } from './Field';

export function ServiceFields({ idPrefix, values, onChange }: FieldsProps) {
  const { t } = useTranslation();
  const id = (field: string) => `${idPrefix}-${field}`;
  const numberField = (field: string, label: string, props: { required?: boolean; min: string; step?: string }) => (
    <Field id={id(field)} label={label} required={props.required}>
      <Input
        id={id(field)}
        type="number"
        inputMode="decimal"
        className="tabular-nums"
        required={props.required}
        min={props.min}
        step={props.step}
        value={values[field]}
        onChange={(e) => onChange(field, e.target.value)}
      />
    </Field>
  );

  return (
    <>
      <Field id={id('service_name')} label={t('staff.manage.form.serviceName')} required>
        <Input
          id={id('service_name')}
          type="text"
          data-qa="manage-service-name"
          required
          value={values.service_name}
          onChange={(e) => onChange('service_name', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {numberField('duration', t('staff.manage.form.duration'), { required: true, min: '1' })}
        {numberField('buffer_before', t('staff.manage.form.bufferBefore'), { min: '0' })}
        {numberField('buffer_after', t('staff.manage.form.bufferAfter'), { min: '0' })}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {numberField('price', t('staff.manage.form.price'), { min: '0', step: '0.01' })}
        <Field id={id('currency')} label={t('staff.manage.form.currency')}>
          <ChoiceSelect id={id('currency')} value={values.currency} options={['ETB', 'USD']} onChange={(value) => onChange('currency', value)} />
        </Field>
      </div>
      <Field id={id('description')} label={t('staff.manage.form.description')}>
        <Textarea id={id('description')} rows={3} value={values.description} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
    </>
  );
}
