import { Input } from '@/components/input';
import { NativeSelect } from '@/components/native-select';
import { Textarea } from '@/components/textarea';
import { useTranslation } from '@/lib/i18n';
import type { OrgOptions } from '../../types';
import { Field, type FieldsProps } from './Field';

interface EventTypeFieldsProps extends FieldsProps {
  options?: OrgOptions;
  /** Longer "create X first" hints are shown when creating. */
  creating?: boolean;
}

// Native pickers: these lists can be long and must honour `required`.
export function EventTypeFields({ idPrefix, values, onChange, options, creating = false }: EventTypeFieldsProps) {
  const { t } = useTranslation();
  const id = (field: string) => `${idPrefix}-${field}`;
  const picker = (field: 'service' | 'provider' | 'location', label: string, items: Array<{ value: string; label: string }>) => {
    const empty = items.length === 0;
    const key = field[0].toUpperCase() + field.slice(1);
    const placeholder = empty
      ? t(`staff.manage.form.no${key}${creating ? 'Hint' : ''}`)
      : t(`staff.manage.form.select${key}`);
    return (
      <Field id={id(field)} label={label} required>
        <NativeSelect id={id(field)} required disabled={empty} value={values[field]} onChange={(e) => onChange(field, e.target.value)}>
          <option value="">{placeholder}</option>
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    );
  };

  return (
    <>
      <Field id={id('event_type_name')} label={t('staff.manage.form.eventTypeName')} required>
        <Input id={id('event_type_name')} type="text" required value={values.event_type_name} onChange={(e) => onChange('event_type_name', e.target.value)} />
      </Field>
      {picker('service', t('staff.manage.form.service'), (options?.services ?? []).map((s) => ({ value: s.name, label: s.service_name })))}
      {picker('provider', t('staff.manage.form.provider'), (options?.providers ?? []).map((p) => ({ value: p.name, label: p.provider_name })))}
      {picker('location', t('staff.manage.form.location'), (options?.locations ?? []).map((l) => ({ value: l.name, label: l.location_name })))}
      <Field id={id('description')} label={t('staff.manage.form.description')}>
        <Textarea id={id('description')} rows={3} value={values.description} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
    </>
  );
}
