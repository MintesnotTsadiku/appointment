import { useState, type ReactNode } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Field } from './fields';
import { MINUTE_OPTIONS, formatTime12, toTime12, toTime24, type Period, type Time12 } from './model';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const PERIODS: Period[] = ['AM', 'PM'];

interface TimeFieldProps {
  id: string;
  /** "HH:mm" in 24-hour time. */
  value: string;
  onValueChange: (value: string) => void;
  /** data-qa prefix: `<prefix>-trigger`, `<prefix>-hour-<n>`, `<prefix>-minute-<n>`, `<prefix>-period-<AM|PM>`. */
  qaPrefix: string;
  error?: string;
}

/** 12-hour start-time picker; the grid fits without scrolling so it works inside a dialog. */
export function TimeField({ id, value, onValueChange, qaPrefix, error }: TimeFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const time = toTime12(value || '09:00');
  const pick = (patch: Partial<Time12>) => onValueChange(toTime24({ ...time, ...patch }));

  return (
    <Field id={id} label={t('staff.receptionDesk.startTime')} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" data-qa={`${qaPrefix}-trigger`} className="w-full justify-between px-3 font-normal">
            <span className="flex items-center gap-2 tabular-nums">
              <Clock className="text-muted-foreground" aria-hidden="true" />
              {formatTime12(time)}
            </span>
            <ChevronDown className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="flex gap-3">
            <Column label={t('staff.receptionDesk.hour')} className="grid-cols-3">
              {HOURS.map((hour) => (
                <Choice key={hour} qa={`${qaPrefix}-hour-${hour}`} selected={time.hour === hour} onClick={() => pick({ hour })}>
                  {hour}
                </Choice>
              ))}
            </Column>
            <Column label={t('staff.receptionDesk.minute')}>
              {MINUTE_OPTIONS.map((minute) => (
                <Choice key={minute} qa={`${qaPrefix}-minute-${minute}`} selected={time.minute === minute} onClick={() => pick({ minute })}>
                  {minute.toString().padStart(2, '0')}
                </Choice>
              ))}
            </Column>
            <Column label={t('staff.receptionDesk.period')}>
              {PERIODS.map((period) => (
                <Choice key={period} qa={`${qaPrefix}-period-${period}`} selected={time.period === period} onClick={() => pick({ period })}>
                  {period}
                </Choice>
              ))}
            </Column>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function Column({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="space-y-1.5 border-r pr-3 last:border-r-0 last:pr-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn('grid gap-1', className)}>{children}</div>
    </div>
  );
}

function Choice({ qa, selected, onClick, children }: { qa: string; selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? 'default' : 'ghost'}
      data-qa={qa}
      aria-pressed={selected}
      onClick={onClick}
      className="h-8 w-11 px-0 tabular-nums"
    >
      {children}
    </Button>
  );
}
