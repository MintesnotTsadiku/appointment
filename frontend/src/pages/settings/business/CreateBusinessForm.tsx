import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { TimeInput } from '@/components/time-input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { FieldHint } from '@/components/settings-layout';
import { formatWallTime, type ClockFormat } from '@/lib/time';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface BusinessForm {
  business_name: string;
  location_name: string;
  service_name: string;
  timezone: string;
  duration: string;
  opens_at: string;
  closes_at: string;
}

interface Props {
  form: BusinessForm;
  onChange: (form: BusinessForm) => void;
  days: string[];
  onDaysChange: (days: string[]) => void;
  clockFormat: ClockFormat;
  onClockFormatChange: (format: ClockFormat) => void;
  windowError: string | null | undefined;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
}

const TEXT_FIELDS = [
  ['business_name', 'staff.business.businessName'],
  ['location_name', 'staff.business.locationName'],
  ['service_name', 'staff.business.serviceName'],
] as const;

export function CreateBusinessForm({ form, onChange, days, onDaysChange, clockFormat, onClockFormatChange, windowError, saving, onSubmit }: Props) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={key}>{t(label)}</Label>
            <Input id={key} required maxLength={100} className="mt-1.5" value={form[key]} onChange={(e) => onChange({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <div>
          <Label htmlFor="duration">{t('staff.business.duration')}</Label>
          <Input id="duration" type="number" min={5} max={480} required className="mt-1.5" value={form.duration} onChange={(e) => onChange({ ...form, duration: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <TimeZoneSelect value={form.timezone} onChange={(timezone) => onChange({ ...form, timezone })} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
        <ClockFormatToggle value={clockFormat} onChange={onClockFormatChange} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="opens_at">{t('staff.business.opensAt')}</Label>
            <div className="mt-1.5">
              <TimeInput id="opens_at" timeFormat={clockFormat} value={form.opens_at} onChange={(value) => onChange({ ...form, opens_at: value })} />
            </div>
            <FieldHint>{formatWallTime(form.opens_at, clockFormat)} · {t('staff.business.stored24')}</FieldHint>
          </div>
          <div>
            <Label htmlFor="closes_at">{t('staff.business.closesAt')}</Label>
            <div className="mt-1.5">
              <TimeInput id="closes_at" timeFormat={clockFormat} value={form.closes_at} onChange={(value) => onChange({ ...form, closes_at: value })} />
            </div>
            <FieldHint>{formatWallTime(form.closes_at, clockFormat)} · {t('staff.business.stored24')}</FieldHint>
            {windowError && <FieldHint error>{windowError}</FieldHint>}
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{t('staff.business.operatingDays')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label key={day} className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={days.includes(day)}
                  onChange={(e) => onDaysChange(e.target.checked ? [...days, day] : days.filter((d) => d !== day))}
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t('staff.business.firstProvider')}</p>
        <Button type="submit" data-qa="business-save" disabled={saving || !days.length || Boolean(windowError)}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {saving ? t('staff.form.saving') : t('staff.business.saveDraft')}
        </Button>
      </div>
    </form>
  );
}
