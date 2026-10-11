import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { useRewardText } from './useRewardText';

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** An optional calendar date (`YYYY-MM-DD`) chosen from a popover; past days are disabled. */
export function DatePickerButton({ id, value, onChange, placeholder, clearLabel, qa }: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  clearLabel: string;
  qa?: string;
}) {
  const [open, setOpen] = useState(false);
  const { date } = useRewardText();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} data-qa={qa} type="button" variant="outline" className="h-11 min-w-0 flex-1 justify-start font-normal sm:flex-none sm:w-56">
            <CalendarDays aria-hidden="true" />
            <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value ? date(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <Calendar
            mode="single"
            selected={value ? new Date(`${value}T12:00:00`) : undefined}
            onSelect={(picked) => {
              onChange(picked ? iso(picked) : null);
              setOpen(false);
            }}
            disabled={(day) => day < today}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={clearLabel} data-qa={qa ? `${qa}-clear` : undefined} onClick={() => onChange(null)}>
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
