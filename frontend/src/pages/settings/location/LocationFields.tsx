import { useState, type ReactNode } from 'react';
import { Building2, Lock, Video } from 'lucide-react';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { PhoneInput } from '@/components/phone-input';
import { OptionSelect } from '@/components/select/OptionSelect';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { FieldHint } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { PLATFORM_SUGGESTIONS } from '@/lib/online-session';
import { TIMEZONES, type LinkMode, type LocationErrors, type LocationFormData, type LocationKind, type Owner, type SessionOption } from './types';

const OTHER = '__other__';

interface LocationFieldsProps {
  form: LocationFormData;
  errors: LocationErrors;
  onChange: (patch: Partial<LocationFormData>) => void;
  /** Shown when the user manages more than one business and the place is new. */
  owners: Owner[];
  platforms: string[];
  /** The owner's sessions a new place can offer (independent businesses). */
  sessions: SessionOption[];
}

export function LocationFields({ form, errors, onChange, owners, platforms, sessions }: LocationFieldsProps) {
  const { t } = useTranslation();
  const online = form.location_type === 'Online';
  return (
    <>
      {owners.length > 1 && (
        <Field id="location-owner" label={t('staff.locations.owner')}>
          <OptionSelect id="location-owner" data-qa="location-owner" value={form.owner}
            onValueChange={(owner) => onChange({ owner, sessions: [] })}
            options={owners.map((owner) => ({ value: owner.key, label: owner.label }))} />
        </Field>
      )}
      <TypeField value={form.location_type} onChange={(location_type) => onChange({ location_type })} />
      {/* The name in English and Amharic side by side; Amharic pages and messages show the Amharic one. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="location_name" qa="location-name" label={t('staff.locations.fields.name')} required value={form.location_name}
          placeholder={t(online ? 'staff.locations.fields.onlineNamePlaceholder' : 'staff.locations.fields.namePlaceholder')}
          error={errors.location_name} onChange={(v) => onChange({ location_name: v })} />
        <TextField id="location_name_am" qa="location-name-am" lang="am" maxLength={100} label={t('staff.locations.fields.nameAm')} value={form.location_name_am}
          placeholder={t('staff.locations.fields.nameAmPlaceholder')} onChange={(v) => onChange({ location_name_am: v })} />
      </div>
      {online ? (
        <OnlineFields form={form} errors={errors} onChange={onChange} platforms={platforms} />
      ) : (
        <>
          <TextField id="address_line_1" qa="location-address" label={t('staff.locations.fields.address1')} required value={form.address_line_1}
            placeholder={t('staff.locations.fields.address1Placeholder')} error={errors.address_line_1} onChange={(v) => onChange({ address_line_1: v })} />
          <TextField id="address_line_2" label={t('staff.locations.fields.address2')} value={form.address_line_2}
            placeholder={t('staff.locations.fields.address2Placeholder')} onChange={(v) => onChange({ address_line_2: v })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField id="city" label={t('staff.locations.fields.city')} required value={form.city}
              placeholder={t('staff.locations.fields.cityPlaceholder')} error={errors.city} onChange={(v) => onChange({ city: v })} />
            <Field id="phone" label={t('staff.locations.fields.phone')} error={errors.phone}>
              <PhoneInput id="phone" value={form.phone} messages={false} showError={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined} onChange={(phone) => onChange({ phone })} />
            </Field>
          </div>
          <TextField id="address_am" qa="location-address-am" lang="am" maxLength={280} label={t('staff.locations.fields.addressAm')} value={form.address_am}
            placeholder={t('staff.locations.fields.addressAmPlaceholder')} hint={t('staff.locations.fields.amharicHint')}
            onChange={(v) => onChange({ address_am: v })} />
        </>
      )}
      <Field id="timezone" label={t('staff.locations.fields.timezone')}>
        <OptionSelect id="timezone" value={form.timezone} onValueChange={(timezone) => onChange({ timezone })}
          options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))} />
      </Field>
      {sessions.length > 0 && <SessionsField selected={form.sessions} sessions={sessions} onChange={(ids) => onChange({ sessions: ids })} />}
    </>
  );
}

function TypeField({ value, onChange }: { value: LocationKind; onChange: (value: LocationKind) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label id="location-type-label">{t('staff.locations.typeLabel')}</Label>
      <ToggleGroup type="single" value={value} aria-labelledby="location-type-label" className="grid w-full grid-cols-2"
        onValueChange={(next) => next && onChange(next as LocationKind)} data-qa="location-type">
        <ToggleGroupItem value="In person" className="h-10 gap-2" data-qa="location-type-in-person">
          <Building2 className="h-4 w-4" aria-hidden="true" />{t('staff.locations.typeInPerson')}
        </ToggleGroupItem>
        <ToggleGroupItem value="Online" className="h-10 gap-2" data-qa="location-type-online">
          <Video className="h-4 w-4" aria-hidden="true" />{t('staff.locations.typeOnline')}
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldHint>{t(value === 'Online' ? 'staff.locations.typeHintOnline' : 'staff.locations.typeHintInPerson')}</FieldHint>
    </div>
  );
}

function OnlineFields({ form, errors, onChange, platforms }: Pick<LocationFieldsProps, 'form' | 'errors' | 'onChange' | 'platforms'>) {
  const { t } = useTranslation();
  const suggestions = platforms.length ? platforms : PLATFORM_SUGGESTIONS;
  const listed = suggestions.includes(form.video_platform);
  const [other, setOther] = useState(!listed && form.video_platform !== '');
  const choice = other || (!listed && form.video_platform) ? OTHER : form.video_platform;
  const fixed = form.meeting_link_mode === 'Fixed link';
  return (
    <>
      <Field id="video_platform" label={t('staff.locations.platform')}>
        <OptionSelect id="video_platform" data-qa="location-platform" value={choice} placeholder={t('staff.locations.platformPlaceholder')}
          onValueChange={(value) => {
            setOther(value === OTHER);
            onChange({ video_platform: value === OTHER ? '' : value });
          }}
          options={[...suggestions.map((name) => ({ value: name, label: name })), { value: OTHER, label: t('staff.locations.platformOther') }]} />
        {choice === OTHER && (
          <Input id="video_platform_other" data-qa="location-platform-other" className="mt-2" maxLength={60} value={form.video_platform}
            aria-label={t('staff.locations.platformOtherPlaceholder')} placeholder={t('staff.locations.platformOtherPlaceholder')}
            onChange={(event) => onChange({ video_platform: event.target.value })} />
        )}
      </Field>
      <div className="space-y-1.5">
        <Label id="link-mode-label">{t('staff.locations.linkMode')}</Label>
        <ToggleGroup type="single" value={form.meeting_link_mode} aria-labelledby="link-mode-label" className="grid w-full grid-cols-2"
          onValueChange={(next) => next && onChange({ meeting_link_mode: next as LinkMode })} data-qa="location-link-mode">
          <ToggleGroupItem value="Fixed link" className="h-auto min-h-10 whitespace-normal py-2" data-qa="location-link-fixed">{t('staff.locations.linkFixed')}</ToggleGroupItem>
          <ToggleGroupItem value="Per booking" className="h-auto min-h-10 whitespace-normal py-2" data-qa="location-link-per-booking">{t('staff.locations.linkPerBooking')}</ToggleGroupItem>
        </ToggleGroup>
        <FieldHint>{t(fixed ? 'staff.locations.linkFixedHint' : 'staff.locations.linkPerBookingHint')}</FieldHint>
      </div>
      {fixed && (
        <div className="space-y-1.5">
          <TextField id="meeting_link" qa="location-link" type="url" label={t('staff.locations.link')} required value={form.meeting_link}
            placeholder="https://meet.google.com/…" error={errors.meeting_link} onChange={(v) => onChange({ meeting_link: v })} />
          {!errors.meeting_link && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{t('staff.locations.linkPrivate')}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function SessionsField({ selected, sessions, onChange }: { selected: string[]; sessions: SessionOption[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...selected, id] : selected.filter((s) => s !== id));
  return (
    <fieldset className="space-y-2" data-qa="location-sessions">
      <legend className="text-sm font-medium text-foreground">{t('staff.locations.sessionsHere')}</legend>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2">
        {sessions.map((session) => (
          <label key={session.name} htmlFor={`session-${session.name}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
            <Checkbox id={`session-${session.name}`} checked={selected.includes(session.name)}
              onCheckedChange={(checked) => toggle(session.name, checked === true)} className="shrink-0" />
            <span className="min-w-0 text-sm font-medium text-foreground">{session.service_name}</span>
          </label>
        ))}
      </div>
      <FieldHint>{t('staff.locations.sessionsHereHint')}</FieldHint>
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
  qa?: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  error?: string;
  hint?: string;
  lang?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}

function TextField({ id, qa, label, value, placeholder, required, type = 'text', error, hint, lang, maxLength, onChange }: TextFieldProps) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint}>
      <Input
        id={id}
        data-qa={qa}
        type={type}
        lang={lang}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={error ? 'border-destructive focus-visible:ring-destructive' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
