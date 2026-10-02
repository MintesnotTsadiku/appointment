import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Switch } from '@/components/switch';
import { FieldHint } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { LEAD_HOURS, leadTimeValid } from './leadTime';

export interface NotificationSettings {
  send_confirmation: number;
  send_reschedule: number;
  send_cancellation: number;
  send_reminder: number;
  reminder_lead_hours: number;
}

type EventField = 'send_confirmation' | 'send_reschedule' | 'send_cancellation' | 'send_reminder';

const EVENTS: Array<{ field: EventField; key: string }> = [
  { field: 'send_confirmation', key: 'confirmation' },
  { field: 'send_reschedule', key: 'reschedule' },
  { field: 'send_cancellation', key: 'cancellation' },
  { field: 'send_reminder', key: 'reminder' },
];

/** One switch per customer email, plus the reminder lead time. */
export function EventSettings({ value, onChange }: { value: NotificationSettings; onChange: (next: NotificationSettings) => void }) {
  const { t } = useTranslation();
  const leadValid = leadTimeValid(value.reminder_lead_hours);

  return (
    <div className="space-y-1">
      <ul className="divide-y">
        {EVENTS.map(({ field, key }) => (
          <li key={field} className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <Label htmlFor={`notify-${key}`} className="text-sm font-medium text-foreground">
                {t(`staff.notifications.${key}`)}
              </Label>
              <p id={`notify-${key}-hint`} className="mt-0.5 text-sm text-muted-foreground">
                {t(`staff.notifications.${key}Hint`)}
              </p>
            </div>
            <Switch
              id={`notify-${key}`}
              data-qa={`notify-${key}`}
              checked={value[field] === 1}
              onCheckedChange={(checked) => onChange({ ...value, [field]: checked ? 1 : 0 })}
              aria-describedby={`notify-${key}-hint`}
            />
          </li>
        ))}
      </ul>
      {value.send_reminder === 1 && (
        <div className="max-w-xs pt-2">
          <Label htmlFor="notify-lead-hours">{t('staff.notifications.leadTime')}</Label>
          <Input
            id="notify-lead-hours"
            data-qa="notify-lead-hours"
            type="number"
            inputMode="numeric"
            min={LEAD_HOURS.min}
            max={LEAD_HOURS.max}
            className="mt-1.5 tabular-nums"
            value={value.reminder_lead_hours}
            aria-invalid={!leadValid}
            aria-describedby="notify-lead-hours-hint"
            onChange={(e) => onChange({ ...value, reminder_lead_hours: parseInt(e.target.value, 10) || 0 })}
          />
          <FieldHint id="notify-lead-hours-hint" error={!leadValid}>
            {t('staff.notifications.leadTimeHint')}
          </FieldHint>
        </div>
      )}
    </div>
  );
}
