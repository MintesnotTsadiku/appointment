import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import { TimeInput } from '@/components/time-input';
import { useTranslation } from '@/lib/i18n';
import { formatWallTime, type ClockFormat } from '@/lib/time';
import { DAYS, type SetupForm } from './types';


// Override the primitive's legacy palette with theme tokens.
const CHECKBOX = 'border-input accent-primary text-primary focus:ring-ring dark:border-input dark:bg-background dark:checked:bg-primary';

interface HoursProps {
  form: SetupForm;
  onChange: (patch: Partial<SetupForm>) => void;
  clockFormat: ClockFormat;
  onClockFormat: (format: ClockFormat) => void;
  windowError: string | null;
  selectedDays: string[];
  onDays: (days: string[]) => void;
}

export function HoursSection({ form, onChange, clockFormat, onClockFormat, windowError, selectedDays, onDays }: HoursProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('staff.onboarding.hoursTitle')} description={t('staff.onboarding.hoursDescription')}>
      <div className="space-y-6">
        <ClockFormatToggle value={clockFormat} onChange={onClockFormat} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TimeField id="opens_at" label={t('staff.business.opensAt')} value={form.opens_at} clockFormat={clockFormat} onChange={(opens_at) => onChange({ opens_at })} />
          <div className="min-w-0">
            <TimeField id="closes_at" label={t('staff.business.closesAt')} value={form.closes_at} clockFormat={clockFormat} onChange={(closes_at) => onChange({ closes_at })} />
            {windowError && <FieldHint error>{windowError}</FieldHint>}
          </div>
        </div>
        <DayPicker selectedDays={selectedDays} onDays={onDays} />
      </div>
    </SettingsSection>
  );
}

function TimeField({ id, label, value, clockFormat, onChange }: { id: string; label: string; value: string; clockFormat: ClockFormat; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <TimeInput id={id} timeFormat={clockFormat} value={value} onChange={onChange} />
      <FieldHint>
        {t('staff.onboarding.value24')}: <span className="tabular-nums">{value}</span> · {formatWallTime(value, clockFormat)}
      </FieldHint>
    </div>
  );
}

function DayPicker({ selectedDays, onDays }: { selectedDays: string[]; onDays: (days: string[]) => void }) {
  const { t } = useTranslation();
  const toggle = (day: string, checked: boolean) => onDays(checked ? [...selectedDays, day] : selectedDays.filter((d) => d !== day));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{t('staff.business.operatingDays')}</legend>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => (
          <label
            key={day}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <Checkbox className={CHECKBOX} checked={selectedDays.includes(day)} onChange={(e) => toggle(day, e.target.checked)} />
            {t(`staff.onboarding.days.${day.toLowerCase()}`)}
          </label>
        ))}
      </div>
      {!selectedDays.length && <FieldHint error>{t('staff.onboarding.daysRequired')}</FieldHint>}
    </fieldset>
  );
}
