import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import type { ServiceFormErrors, ServiceFormValues } from './useServiceForm';

interface SectionProps {
  values: ServiceFormValues;
  errors: ServiceFormErrors;
  setField: (field: keyof ServiceFormValues, value: string) => void;
}

export function ServiceDetailsSection({ values, errors, setField }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection id="service-details" title={t('staff.services.detailsTitle')} description={t('staff.services.detailsDescription')}>
      <div className="space-y-4">
        <Field id="serviceName" label={t('staff.services.nameLabel')} required error={errors.serviceName}>
          <Input
            id="serviceName"
            value={values.serviceName}
            onChange={(e) => setField('serviceName', e.target.value)}
            placeholder={t('staff.services.namePlaceholder')}
            aria-invalid={!!errors.serviceName}
            aria-describedby={errors.serviceName ? 'serviceName-error' : undefined}
          />
        </Field>
        <Field id="description" label={t('staff.services.descriptionLabel')}>
          <Textarea
            id="description"
            value={values.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder={t('staff.services.descriptionPlaceholder')}
            rows={3}
          />
        </Field>
      </div>
    </SettingsSection>
  );
}

export function ServicePricingSection({ values, errors, setField }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection id="service-pricing" title={t('staff.services.pricingTitle')} description={t('staff.services.pricingDescription')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="duration" label={t('staff.services.durationLabel')} required error={errors.duration}>
          <Input
            id="duration"
            type="number"
            inputMode="numeric"
            value={values.duration}
            onChange={(e) => setField('duration', e.target.value)}
            min="5"
            step="5"
            className="tabular-nums"
            aria-invalid={!!errors.duration}
            aria-describedby={errors.duration ? 'duration-error' : undefined}
          />
        </Field>
        <Field id="price" label={t('staff.services.priceLabel')}>
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            value={values.price}
            onChange={(e) => setField('price', e.target.value)}
            min="0"
            step="0.01"
            className="tabular-nums"
          />
        </Field>
        <Field id="buffer" label={t('staff.services.bufferLabel')} hint={t('staff.services.bufferHint')}>
          <Input
            id="buffer"
            type="number"
            inputMode="numeric"
            value={values.buffer}
            onChange={(e) => setField('buffer', e.target.value)}
            min="0"
            className="tabular-nums"
          />
        </Field>
      </div>
    </SettingsSection>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ id, label, required, error, hint, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <FieldHint error id={`${id}-error`}>
          {error}
        </FieldHint>
      ) : (
        hint && <FieldHint>{hint}</FieldHint>
      )}
    </div>
  );
}
