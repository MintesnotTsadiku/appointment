import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Checkbox } from '@/components/checkbox';
import { NativeSelect } from '@/components/native-select';
import { FieldHint } from '@/components/settings-layout';
import type { useCreateServiceForm, ServiceFormOptions } from './useCreateServiceForm';

type FormApi = ReturnType<typeof useCreateServiceForm>;

/** Organization, provider and location pickers; each only renders when the options apply. */
export function ServiceScopeFields({ form, options }: { form: FormApi; options: ServiceFormOptions | undefined }) {
  const { t } = useTranslation();
  const { values, errors, setField } = form;
  const orgProviders = values.organization ? options?.org_providers[values.organization] : undefined;

  return (
    <>
      {options?.is_organization_user && options.organizations.length > 0 && (
        <Field id="service-organization" label={t('staff.services.organization')} required error={errors.organization}>
          {/* Native select keeps the empty "no organization" choice selectable. */}
          <NativeSelect id="service-organization" value={values.organization} onChange={(e) => setField('organization', e.target.value)}>
            <option value="">{t('staff.services.selectOrganization')}</option>
            {options.organizations.map((org) => (
              <option key={org.name} value={org.name}>
                {org.organization_name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {orgProviders && (
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-sm font-medium leading-none">
            {t('staff.services.providersTitle')}
            <span className="text-destructive"> *</span>
          </legend>
          <ul className={`mt-1.5 max-h-40 divide-y overflow-y-auto rounded-md border ${errors.providers ? 'border-destructive' : ''}`}>
            {orgProviders.map((provider) => (
              <li key={provider.name}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/40">
                  <Checkbox
                    className="h-4 w-4 border-input accent-primary dark:border-input dark:bg-background"
                    checked={form.selectedProviders.includes(provider.name)}
                    onCheckedChange={(checked) => form.toggleProvider(provider.name, checked)}
                  />
                  <span className="min-w-0 truncate text-foreground">{provider.provider_name}</span>
                  {Boolean(provider.is_primary) && <span className="text-xs text-muted-foreground">({t('staff.services.primary')})</span>}
                </label>
              </li>
            ))}
          </ul>
          {errors.providers && <FieldHint error>{errors.providers}</FieldHint>}
        </fieldset>
      )}

      {options?.locations && options.locations.length > 0 && (
        <Field id="service-location" label={t('staff.services.locationLabel')} required error={errors.location}>
          <NativeSelect id="service-location" value={values.location} onChange={(e) => setField('location', e.target.value)} aria-invalid={!!errors.location}>
            <option value="">{t('staff.services.selectLocation')}</option>
            {options.locations.map((loc) => (
              <option key={loc.name} value={loc.name}>
                {loc.location_name}
                {loc.organization && ` (${t('staff.services.orgBranch')})`}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
    </>
  );
}

export function ServiceBasicsFields({ form }: { form: FormApi }) {
  const { t } = useTranslation();
  const { values, errors, setField } = form;
  return (
    <>
      <Field id="serviceName" label={t('staff.services.nameLabel')} required error={errors.serviceName}>
        <Input
          id="serviceName"
          value={values.serviceName}
          onChange={(e) => setField('serviceName', e.target.value)}
          placeholder={t('staff.services.createNamePlaceholder')}
          aria-invalid={!!errors.serviceName}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="duration" label={t('staff.services.durationShort')} required error={errors.duration}>
          <Input
            id="duration"
            type="number"
            inputMode="numeric"
            min="5"
            step="5"
            placeholder="30"
            className="tabular-nums"
            value={values.duration}
            onChange={(e) => setField('duration', e.target.value)}
            aria-invalid={!!errors.duration}
          />
        </Field>
        <Field id="buffer" label={t('staff.services.bufferShortLabel')}>
          <Input id="buffer" type="number" inputMode="numeric" min="0" step="5" placeholder="0" className="tabular-nums" value={values.buffer} onChange={(e) => setField('buffer', e.target.value)} />
        </Field>
        <Field id="price" label={t('staff.services.priceLabel')}>
          <Input id="price" type="number" inputMode="decimal" min="0" step="10" placeholder="0" className="tabular-nums" value={values.price} onChange={(e) => setField('price', e.target.value)} />
        </Field>
      </div>

      <Field id="service-description" label={t('staff.services.descriptionOptional')}>
        <Textarea
          id="service-description"
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder={t('staff.services.createDescriptionPlaceholder')}
          rows={3}
          className="resize-none"
        />
      </Field>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-medium text-foreground">{t('staff.services.availabilityNoteTitle')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('staff.services.availabilityNoteBody')}</p>
        </div>
      </div>
    </>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <FieldHint error>{error}</FieldHint>}
    </div>
  );
}
