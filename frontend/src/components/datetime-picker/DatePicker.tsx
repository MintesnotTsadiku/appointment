import { useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  /** A local calendar date, `YYYY-MM-DD`, or '' for none. */
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  /** Earliest and latest choosable dates, `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Show a clear button for optional dates. */
  clearable?: boolean;
  className?: string;
  'data-qa'?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

/** The standard date field: a button that opens the shadcn calendar. Values stay local dates, never UTC instants. */
export function DatePicker({ value, onValueChange, id, placeholder, min, max, disabled, clearable, className, ...aria }: DatePickerProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = value ? localDate(value) : undefined;
  const label = selected ? new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' }).format(selected) : placeholder ?? t('controls.pickDate');
  const choose = (date: Date | undefined) => {
    // Clicking the chosen day again deselects it in the calendar; keep the value and close.
    if (date) onValueChange(isoDate(date));
    setOpen(false);
  };
  return <div className={cn('flex min-w-0 items-center gap-1', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} data-qa={aria['data-qa']} data-value={value}
          aria-label={aria['aria-label']} aria-invalid={aria['aria-invalid']}
          className="h-10 w-full min-w-0 justify-between px-3 font-normal">
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={choose} initialFocus
          disabled={(date) => Boolean((min && date < localDate(min)) || (max && date > localDate(max)))} />
      </PopoverContent>
    </Popover>
    {clearable && value && !disabled && <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0"
      aria-label={t('controls.clearDate')} data-qa={aria['data-qa'] ? `${aria['data-qa']}-clear` : undefined} onClick={() => onValueChange('')}>
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>}
  </div>;
}

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}
