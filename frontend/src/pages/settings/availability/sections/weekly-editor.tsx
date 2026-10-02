import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Label } from '@/components/label';
import { SettingsSection } from '@/components/settings-layout';
import { Switch } from '@/components/switch';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { DAYS_OF_WEEK, type AvailabilityLevel, type DaySchedule } from '../lib/schedule';
import { DayRow } from './day-row';

interface WeeklyEditorProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  useDefaultHours: boolean;
  onUseDefaultChange?: (useDefault: boolean) => void;
  parentSchedule?: DaySchedule[];
  level: AvailabilityLevel;
  timeFormat: ClockFormat;
}

const NEW_RANGE = { start: '08:30', end: '18:00' };

/** Weekly hours: optional default-hours switch, parent-hours notice and one row per day. */
export function WeeklyEditor({ schedule, onChange, useDefaultHours, onUseDefaultChange, parentSchedule, level, timeFormat }: WeeklyEditorProps) {
  const { t } = useTranslation();
  const updateDay = (day: string, update: (d: DaySchedule) => DaySchedule) =>
    onChange(schedule.map((d) => (d.day === day ? update(d) : d)));

  const toggle = (day: string) =>
    updateDay(day, (d) => ({ ...d, isOpen: !d.isOpen, ranges: d.isOpen ? [] : [{ ...NEW_RANGE }] }));
  const addRange = (day: string) =>
    updateDay(day, (d) => ({ ...d, ranges: [...d.ranges, { start: d.ranges[d.ranges.length - 1]?.end ?? NEW_RANGE.start, end: NEW_RANGE.end }] }));
  const removeRange = (day: string, index: number) =>
    updateDay(day, (d) => ({ ...d, ranges: d.ranges.filter((_, i) => i !== index) }));
  const changeRange = (day: string, index: number, field: 'start' | 'end', value: string) =>
    updateDay(day, (d) => ({ ...d, ranges: d.ranges.map((r, i) => (i === index ? { ...r, [field]: value } : r)) }));

  return (
    <SettingsSection title={t('staff.availability.weeklyHours')} description={t(`staff.availability.levelDescription.${level}`)}>
      <div className="space-y-5">
        {onUseDefaultChange && (
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="min-w-0">
              <Label htmlFor="use-default" className="cursor-pointer">{t('staff.availability.useDefault')}</Label>
              <p id="use-default-hint" className="mt-1 text-sm text-muted-foreground">
                {useDefaultHours ? t('staff.availability.useDefaultOn') : t('staff.availability.useDefaultOff')}
              </p>
            </div>
            <Switch id="use-default" checked={useDefaultHours} onCheckedChange={onUseDefaultChange} aria-describedby="use-default-hint" />
          </div>
        )}
        {parentSchedule && parentSchedule.length > 0 && (
          <Alert variant="warning" role="note">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>{level === 'service' ? t('staff.availability.locationHours') : t('staff.availability.serviceLocationHours')}</AlertTitle>
            <AlertDescription>{t(`staff.availability.parentNotice.${level}`)}</AlertDescription>
          </Alert>
        )}
        <ul className="divide-y">
          {DAYS_OF_WEEK.map((dayName) => {
            const day = schedule.find((d) => d.day === dayName) || { day: dayName, ranges: [], isOpen: false };
            const parentRanges = parentSchedule?.find((d) => d.day === dayName)?.ranges || [];
            return (
              <DayRow
                key={dayName}
                day={day}
                parentRanges={parentRanges}
                timeFormat={timeFormat}
                onToggle={() => toggle(dayName)}
                onAddRange={() => addRange(dayName)}
                onRemoveRange={(index) => removeRange(dayName, index)}
                onRangeChange={(index, field, value) => changeRange(dayName, index, field, value)}
              />
            );
          })}
        </ul>
      </div>
    </SettingsSection>
  );
}
