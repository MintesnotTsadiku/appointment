import { Label } from '@/components/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';

const FORMATS: Array<{ value: ClockFormat; labelKey: string; example: string }> = [
  { value: '12h', labelKey: 'staff.availability.format12h', example: '9:30 AM' },
  { value: '24h', labelKey: 'staff.availability.format24h', example: '09:30' },
  { value: 'ethiopian', labelKey: 'staff.availability.formatLocal', example: '3:30 ጠዋት' },
];

/** Display-only clock format for the editor; stored times are always 24-hour. */
export function TimeFormatPicker({ value, onChange }: { value: ClockFormat; onChange: (format: ClockFormat) => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <Label id="availability-time-format-label" className="mb-2 block">
        {t('staff.availability.timeFormat')}
      </Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => next && onChange(next as ClockFormat)}
        aria-labelledby="availability-time-format-label"
        className="grid h-10 w-full grid-cols-3"
      >
        {FORMATS.map((format) => (
          <ToggleGroupItem key={format.value} value={format.value} size="sm" className="h-8 min-w-0 gap-1 px-2">
            <span className="truncate">{t(format.labelKey)}</span>
            <span className="hidden truncate text-muted-foreground tabular-nums lg:inline">· {format.example}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
