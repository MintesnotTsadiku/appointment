import { useState, type InputHTMLAttributes } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';

/** Date-only values stay local calendar dates, never UTC instants. */
export function DateField({ value, onValueChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const select = (date: Date | undefined) => {
    onValueChange(date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '');
    setOpen(false);
  };
  return <div className="relative mt-1 flex items-center gap-2">
    <input {...props} type="date" value={value} onChange={event => onValueChange(event.target.value)} className="platform-date-entry min-w-0 flex-1"/>
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" disabled={props.disabled} aria-label={`Choose ${props['aria-label'] || 'date'}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}><CalendarDays size={18}/></button></PopoverTrigger><PopoverContent align="end" className="w-auto p-1"><Calendar mode="single" required={props.required} selected={selected} onSelect={select} initialFocus disabled={date => Boolean((props.min && date < new Date(`${props.min}T00:00:00`)) || (props.max && date > new Date(`${props.max}T23:59:59`)))}/></PopoverContent></Popover>
  </div>;
}
