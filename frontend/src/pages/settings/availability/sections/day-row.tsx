import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';
import { FieldHint } from '@/components/settings-layout';
import { TimeInput } from '@/components/time-input';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { cn } from '@/lib/utils';
import { formatTime, isRangeWithinParent, type DaySchedule, type TimeRange } from '../lib/schedule';

interface DayRowProps {
  day: DaySchedule;
  parentRanges: TimeRange[];
  timeFormat: ClockFormat;
  onToggle: () => void;
  onAddRange: () => void;
  onRemoveRange: (index: number) => void;
  onRangeChange: (index: number, field: 'start' | 'end', value: string) => void;
}

/** One weekday: native on/off checkbox (QA reads `:checked`) and its time ranges below. */
export function DayRow({ day, parentRanges, timeFormat, onToggle, onAddRange, onRemoveRange, onRangeChange }: DayRowProps) {
  const { t } = useTranslation();
  const checkboxId = `day-${day.day}`;
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex min-h-10 items-center justify-between gap-3 sm:w-40 sm:shrink-0">
        <div className="flex items-center gap-3">
          <Checkbox
            id={checkboxId}
            data-qa={`availability-day-${day.day}`}
            checked={day.isOpen}
            onCheckedChange={onToggle}
            className="h-5 w-5 cursor-pointer accent-primary"
          />
          <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-medium text-foreground">
            {t(`staff.availability.days.${day.day}`)}
          </Label>
        </div>
        <span className={cn('text-xs sm:hidden', day.isOpen ? 'text-success' : 'text-muted-foreground')}>
          {day.isOpen ? t('staff.availability.open') : t('staff.availability.closed')}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {day.isOpen ? (
          <OpenDay day={day} parentRanges={parentRanges} timeFormat={timeFormat} onAddRange={onAddRange} onRemoveRange={onRemoveRange} onRangeChange={onRangeChange} />
        ) : (
          <div className="flex min-h-10 flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('staff.availability.unavailable')}</span>
            <Button type="button" variant="outline" size="sm" onClick={onToggle}>
              <Plus aria-hidden="true" />
              {t('staff.availability.addHours')}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function OpenDay({ day, parentRanges, timeFormat, onAddRange, onRemoveRange, onRangeChange }: Omit<DayRowProps, 'onToggle'>) {
  const { t } = useTranslation();
  const dayLabel = t(`staff.availability.days.${day.day}`);
  return (
    <>
      {day.ranges.length === 0 && <p className="text-sm text-muted-foreground">{t('staff.availability.noRanges')}</p>}
      {day.ranges.map((range, index) => {
        const valid = isRangeWithinParent(range, parentRanges);
        const hintId = `${day.day}-range-${index}-hint`;
        return (
          <div key={index}>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={`${day.day}-range-${index}-start`} className="sr-only">
                {`${dayLabel} ${index + 1}: ${t('staff.availability.rangeStart')}`}
              </Label>
              <TimeInput
                id={`${day.day}-range-${index}-start`}
                value={range.start}
                onChange={(value) => onRangeChange(index, 'start', value)}
                timeFormat={timeFormat}
                className={cn('min-w-[9.5rem] flex-1 sm:max-w-[12rem]', !valid && '[&_input]:border-destructive')}
              />
              <span className="text-sm text-muted-foreground" aria-hidden="true">{t('staff.availability.to')}</span>
              <Label htmlFor={`${day.day}-range-${index}-end`} className="sr-only">
                {`${dayLabel} ${index + 1}: ${t('staff.availability.rangeEnd')}`}
              </Label>
              <TimeInput
                id={`${day.day}-range-${index}-end`}
                value={range.end}
                onChange={(value) => onRangeChange(index, 'end', value)}
                timeFormat={timeFormat}
                className={cn('min-w-[9.5rem] flex-1 sm:max-w-[12rem]', !valid && '[&_input]:border-destructive')}
              />
              {day.ranges.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveRange(index)}
                  aria-label={`${t('staff.availability.removeRange')} (${dayLabel} ${index + 1})`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
            {!valid && <FieldHint error id={hintId}>{t('staff.availability.outsideParent')}</FieldHint>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 text-primary hover:text-primary" onClick={onAddRange}>
          <Plus aria-hidden="true" />
          {t('staff.availability.addRange')}
        </Button>
        {parentRanges.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('staff.availability.parentHours')}: {parentRanges.map((r) => `${formatTime(r.start, timeFormat)} – ${formatTime(r.end, timeFormat)}`).join(', ')}
          </span>
        )}
      </div>
    </>
  );
}
