import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { FieldHint, SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { Textarea } from '@/components/textarea';
import { useTranslation } from '@/lib/i18n';
import { BUSINESS_TYPES, LANGUAGES, TIMEZONES, formFromProvider, type ProfileFormData } from './options';
import type { ProviderProfile } from './useProfileData';

interface ProfileFormProps {
  provider: ProviderProfile;
  email: string;
  onSaved: () => void;
}

export function ProfileForm({ provider, email, onSaved }: ProfileFormProps) {
  const { t } = useTranslation();
  const saved = useMemo(() => formFromProvider(provider), [provider]);
  const [form, setForm] = useState<ProfileFormData>(saved);
  const [isSaving, setIsSaving] = useState(false);
  const { call: updateProfile } = useFrappePostCall('appointment.onboarding.update_provider_profile');

  useEffect(() => setForm(saved), [saved]);

  const dirty = (Object.keys(saved) as (keyof ProfileFormData)[]).some((key) => saved[key] !== form[key]);
  const set = (key: keyof ProfileFormData) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(form);
      toast.success(t('staff.profile.saved'));
      onSaved();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(t('staff.profile.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      id="profile-form"
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <SettingsSection title={t('staff.profile.personalTitle')} description={t('staff.profile.personalDescription')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="provider_name" label={t('staff.profile.fields.providerName')} required>
            <Input id="provider_name" value={form.provider_name} onChange={(e) => set('provider_name')(e.target.value)} placeholder={t('staff.profile.fields.providerNamePlaceholder')} />
          </Field>
          <Field id="full_name" label={t('staff.profile.fields.fullName')}>
            <Input id="full_name" value={form.full_name} onChange={(e) => set('full_name')(e.target.value)} placeholder={t('staff.profile.fields.fullNamePlaceholder')} />
          </Field>
          <Field id="bio" label={t('staff.profile.fields.bio')} className="sm:col-span-2">
            <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => set('bio')(e.target.value)} placeholder={t('staff.profile.fields.bioPlaceholder')} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title={t('staff.profile.contactTitle')} description={t('staff.profile.contactDescription')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="profile-email" label={t('staff.profile.fields.email')} hint={t('staff.profile.fields.emailHint')}>
            <Input id="profile-email" type="email" value={email} readOnly disabled aria-describedby="profile-email-hint" />
          </Field>
          <Field id="phone" label={t('staff.profile.fields.phone')}>
            <Input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="+251 911 234 567" />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title={t('staff.profile.preferencesTitle')} description={t('staff.profile.preferencesDescription')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <OptionField id="business_type" label={t('staff.profile.fields.businessType')} value={form.business_type} options={BUSINESS_TYPES} onChange={set('business_type')} />
          <OptionField id="timezone" label={t('staff.profile.fields.timezone')} value={form.timezone} options={TIMEZONES} onChange={set('timezone')} />
          <OptionField id="language" label={t('staff.profile.fields.language')} value={form.language} options={LANGUAGES} onChange={set('language')} />
        </div>
      </SettingsSection>

      <StickySaveBar dirty={dirty} saving={isSaving} form="profile-form" disabled={!dirty} onDiscard={() => setForm(saved)} saveQa="profile-save" />
    </form>
  );
}

interface OptionFieldProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function OptionField({ id, label, value, options, onChange }: OptionFieldProps) {
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Field({ id, label, required, hint, className, children }: { id: string; label: string; required?: boolean; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}
