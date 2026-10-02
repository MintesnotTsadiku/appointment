import type { ReactNode } from 'react';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import { TimeZoneSelect } from '@/components/timezone-select';
import { useTranslation } from '@/lib/i18n';
import type { SetupForm } from './types';

interface SectionProps {
  form: SetupForm;
  onChange: (patch: Partial<SetupForm>) => void;
}

export function BusinessSection({ form, onChange }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('staff.onboarding.businessTitle')} description={t('staff.onboarding.businessDescription')}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="business_name" label={t('staff.business.businessName')} hint={t('staff.onboarding.businessNameHint')}>
          <Input id="business_name" required maxLength={100} value={form.business_name} onChange={(e) => onChange({ business_name: e.target.value })} aria-describedby="business_name-hint" />
        </Field>
        <Field id="location_name" label={t('staff.business.locationName')} hint={t('staff.onboarding.locationNameHint')}>
          <Input id="location_name" required maxLength={100} value={form.location_name} onChange={(e) => onChange({ location_name: e.target.value })} aria-describedby="location_name-hint" />
        </Field>
        <div className="sm:col-span-2">
          <TimeZoneSelect value={form.timezone} onChange={(timezone) => onChange({ timezone })} label={t('staff.reception.timezone')} />
          <FieldHint>{t('staff.onboarding.timezoneHint')}</FieldHint>
        </div>
      </div>
    </SettingsSection>
  );
}

export function ServiceSection({ form, onChange }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('staff.onboarding.serviceTitle')} description={t('staff.onboarding.serviceDescription')}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="service_name" label={t('staff.onboarding.serviceName')}>
          <Input id="service_name" required maxLength={100} value={form.service_name} onChange={(e) => onChange({ service_name: e.target.value })} />
        </Field>
        <Field id="duration" label={t('staff.onboarding.duration')} hint={t('staff.onboarding.durationHint')}>
          <Input id="duration" type="number" min={5} max={480} required value={form.duration} onChange={(e) => onChange({ duration: e.target.value })} aria-describedby="duration-hint" className="tabular-nums" />
        </Field>
      </div>
    </SettingsSection>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children}
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}
