import { TimeInput } from '@/components/time-input';
import type { ClockFormat } from '@/lib/time';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';

export interface DateTimeFieldProps {
  /** A local wall time, `YYYY-MM-DDTHH:mm` (the `datetime-local` shape), or '' for none. */
  value: string;
  onValueChange: (value: string) => void;
  id: string;
  /** Defaults to Habesha time in Amharic and 12-hour otherwise. */
  timeFormat?: ClockFormat;
  defaultTime?: string;
  required?: boolean;
  disabled?: boolean;
  /** Optional values: a clear button empties both parts. */
  clearable?: boolean;
  className?: string;
  /** Prefix for `<qa>-date` and `<qa>-time`. */
  'data-qa'?: string;
}

/** Date and time of day as two standard controls: the shadcn calendar and the time input. */
export function DateTimeField({ value, onValueChange, id, timeFormat, defaultTime = '09:00', required, disabled, clearable, className, 'data-qa': qa }: DateTimeFieldProps) {
  const [date, time] = value ? [value.slice(0, 10), value.slice(11, 16)] : ['', ''];
  return <div className={cn('grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]', className)}>
    <DatePicker id={id} value={date} disabled={disabled} clearable={clearable} data-qa={qa ? `${qa}-date` : undefined}
      onValueChange={(next) => onValueChange(next ? `${next}T${time || defaultTime}` : '')} />
    <TimeInput id={`${id}-time`} data-qa={qa ? `${qa}-time` : undefined} timeFormat={timeFormat}
      value={time || defaultTime} required={required} disabled={disabled || !date}
      onChange={(next) => date && onValueChange(`${date}T${next || defaultTime}`)} />
  </div>;
}
