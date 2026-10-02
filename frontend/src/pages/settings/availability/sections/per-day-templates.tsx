import { CalendarDays, Coffee } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { formatTime, type DaySchedule } from '../lib/schedule';
import { addLunchBreak, applyTemplate, calculateEndTime, canAddLunch, DURATIONS, START_TIMES } from '../lib/templates';
import { CollapsibleSection } from './collapsible-section';

interface PerDayTemplatesProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  timeFormat: ClockFormat;
}

/** Location-only shortcuts: preset hours per day, plus a lunch split for single-range days. */
export function PerDayTemplates({ schedule, onChange, timeFormat }: PerDayTemplatesProps) {
  const { t } = useTranslation();
  const presets = [false, true].flatMap((includeLunch) =>
    START_TIMES.flatMap((startTime) => DURATIONS.map((duration) => ({ startTime, duration, includeLunch })))
  );

  return (
    <CollapsibleSection icon={CalendarDays} title={t('staff.availability.perDayTemplates')} description={t('staff.availability.perDayDescription')}>
      <ul className="divide-y">
        {schedule.map((day) => (
          <li key={day.day} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{t(`staff.availability.days.${day.day}`)}</span>
              {canAddLunch(day) && (
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                  const next = addLunchBreak(schedule, day.day);
                  if (next) onChange(next);
                }}>
                  <Coffee aria-hidden="true" className="!size-3.5" />
                  {t('staff.availability.addLunch')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <Button
                  key={`${preset.startTime}-${preset.duration}-${preset.includeLunch}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs font-normal tabular-nums"
                  onClick={() => onChange(applyTemplate(schedule, [day.day], preset))}
                >
                  {formatTime(preset.startTime, timeFormat)} – {formatTime(calculateEndTime(preset.startTime, preset.duration), timeFormat)}
                  {preset.includeLunch && ` + ${t('staff.availability.lunch')}`}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
