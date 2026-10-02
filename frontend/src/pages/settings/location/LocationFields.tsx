import type { ReactNode } from 'react';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { FieldHint } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { TIMEZONES, type LocationErrors, type LocationFormData, type ProviderOption, type ServiceOption } from './types';

interface LocationFieldsProps {
  form: LocationFormData;
  errors: LocationErrors;
  onChange: (patch: Partial<LocationFormData>) => void;
  /** Empty when the provider picker should be hidden. */
  providers: ProviderOption[];
  /** Empty when service linking should be hidden. */
  services: ServiceOption[];
}

export function LocationFields({ form, errors, onChange, providers, services }: LocationFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <TextField id="location_name" label={t('staff.locations.fields.name')} required value={form.location_name}
        placeholder={t('staff.locations.fields.namePlaceholder')} error={errors.location_name} onChange={(v) => onChange({ location_name: v })} />
      <TextField id="address_line_1" label={t('staff.locations.fields.address1')} required value={form.address_line_1}
        placeholder={t('staff.locations.fields.address1Placeholder')} error={errors.address_line_1} onChange={(v) => onChange({ address_line_1: v })} />
      <TextField id="address_line_2" label={t('staff.locations.fields.address2')} value={form.address_line_2}
        placeholder={t('staff.locations.fields.address2Placeholder')} onChange={(v) => onChange({ address_line_2: v })} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="city" label={t('staff.locations.fields.city')} required value={form.city}
          placeholder={t('staff.locations.fields.cityPlaceholder')} error={errors.city} onChange={(v) => onChange({ city: v })} />
        <TextField id="phone" type="tel" label={t('staff.locations.fields.phone')} value={form.phone}
          placeholder="+251 911 234 567" onChange={(v) => onChange({ phone: v })} />
      </div>
      <Field id="timezone" label={t('staff.locations.fields.timezone')}>
        <Select value={form.timezone} onValueChange={(value) => onChange({ timezone: value })}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {providers.length > 0 && <ProviderField value={form.provider_id} providers={providers} onChange={(v) => onChange({ provider_id: v })} />}
      {services.length > 0 && <ServiceField selected={form.service_ids} services={services} onChange={(ids) => onChange({ service_ids: ids })} />}
    </>
  );
}

function ProviderField({ value, providers, onChange }: { value: string; providers: ProviderOption[]; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <Field id="provider_id" label={t('staff.locations.fields.provider')} hint={t('staff.locations.fields.providerHint')}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="provider_id" aria-describedby="provider_id-hint">
          <SelectValue placeholder={t('staff.locations.fields.providerPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {providers.map((provider) => (
            <SelectItem key={provider.name} value={provider.name}>
              {provider.provider_name} {provider.full_name ? `(${provider.full_name})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ServiceField({ selected, services, onChange }: { selected: string[]; services: ServiceOption[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...selected, id] : selected.filter((s) => s !== id));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{t('staff.locations.fields.services')}</legend>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2">
        {services.map((service) => (
          <label key={service.name} htmlFor={`service-${service.name}`} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-accent">
            <Checkbox
              id={`service-${service.name}`}
              checked={selected.includes(service.name)}
              onCheckedChange={(checked) => toggle(service.name, checked)}
              className="mt-0.5 shrink-0 accent-primary"
            />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-foreground">{service.service_name}</span>
              {service.description && <span className="block text-xs text-muted-foreground">{service.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldHint>{t('staff.locations.fields.servicesHint')}</FieldHint>
    </fieldset>
  );
}

function Field({ id, label, required, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? <FieldHint error id={`${id}-error`}>{t(error)}</FieldHint> : hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  error?: string;
  onChange: (value: string) => void;
}

function TextField({ id, label, value, placeholder, required, type = 'text', error, onChange }: TextFieldProps) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={error ? 'border-destructive focus-visible:ring-destructive' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
