import { useRef, useState, type ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';

/** Keep the original input and its form registration as the source of truth. */
export function CalendarInput({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const input = () => container.current?.querySelector('input');
  const field = input();
  const selected = field?.value ? new Date(`${field.value}T12:00:00`) : undefined;
  const choose = (date: Date | undefined) => {
    const target = input();
    if (!target) return;
    const value = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(target, value);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
    setOpen(false);
  };
  return <div ref={container} className="platform-calendar-input flex min-w-0 items-center gap-2">{children}<Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" aria-label="Open date calendar" disabled={disabled} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}><CalendarDays size={17}/></button></PopoverTrigger><PopoverContent align="end" className="w-auto p-1"><Calendar mode="single" required={field?.required} selected={selected} onSelect={choose} initialFocus disabled={date => Boolean((field?.min && date < new Date(`${field.min}T00:00:00`)) || (field?.max && date > new Date(`${field.max}T23:59:59`)))}/></PopoverContent></Popover></div>;
}
