import { useEffect, useId, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { formatWallTime, parseDisplayTime, parseWallTime, type ClockFormat } from '@/lib/time';

export type TimeFormat = ClockFormat;
interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  timeFormat: ClockFormat;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  onValidityChange?: (valid: boolean) => void;
}

export function TimeInput({ value, onChange, timeFormat, disabled, className, placeholder, id, onValidityChange }: TimeInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const input = useRef<HTMLInputElement>(null);
  const validityChanged = useRef(onValidityChange);
  validityChanged.current = onValidityChange;
  const [draft, setDraft] = useState(formatWallTime(value, timeFormat));
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const parts = parseWallTime(value) || { hour: 9, minute: 0 };
  const example = formatWallTime('19:30', timeFormat);
  const help = timeFormat === 'ethiopian' ? 'Include the period: ጠዋት, ከሰዓት, ምሽት or ሌሊት.' : timeFormat === '12h' ? 'Include AM or PM.' : 'Use hours 00–23 and minutes 00–59.';

  useEffect(() => {
    setDraft(formatWallTime(value, timeFormat));
    setError('');
    input.current?.setCustomValidity('');
    validityChanged.current?.(true);
  }, [value, timeFormat]);

  function edit(text: string, commit: boolean) {
    setDraft(text);
    const parsed = parseDisplayTime(text, timeFormat);
    const message = parsed ? '' : `Enter a valid time, for example ${example}. ${help}`;
    setError(message);
    input.current?.setCustomValidity(message);
    onValidityChange?.(!!parsed);
    if (commit && parsed) {
      onChange(parsed);
      setDraft(formatWallTime(parsed, timeFormat));
    }
  }
  function choose(hour: number, minute: number) {
    const next = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    edit(formatWallTime(next, timeFormat), true);
  }
  return <div className={className}>
    <div className="flex gap-2">
      <Input ref={input} id={inputId} value={draft} disabled={disabled} required autoComplete="off"
        placeholder={placeholder || example} aria-invalid={!!error} aria-describedby={`${inputId}-help`}
        onChange={event => edit(event.target.value, false)} onBlur={() => edit(draft, true)}
        onKeyDown={event => { if (event.key === 'Enter') edit(draft, true); }} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled} aria-label="Choose time" data-qa={`${inputId}-picker`}><Clock className="h-4 w-4" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-xl p-4" aria-label="Choose time">
          <div><p className="font-semibold">Choose time</p><p className="text-xs text-muted-foreground">{help}</p></div>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div><p id={`${inputId}-hour-label`} className="mb-1 text-sm">Hour</p><Select value={String(parts.hour)} onValueChange={hour => choose(+hour, parts.minute)}>
              <SelectTrigger aria-labelledby={`${inputId}-hour-label`}><SelectValue /></SelectTrigger><SelectContent>
                {Array.from({ length: 24 }, (_, hour) => <SelectItem key={hour} value={String(hour)}>{formatWallTime(`${String(hour).padStart(2, '0')}:00`, timeFormat)}</SelectItem>)}
              </SelectContent></Select></div>
            <div><p id={`${inputId}-minute-label`} className="mb-1 text-sm">Minute</p><Select value={String(parts.minute)} onValueChange={minute => choose(parts.hour, +minute)}>
              <SelectTrigger aria-labelledby={`${inputId}-minute-label`}><SelectValue /></SelectTrigger><SelectContent>
                {Array.from({ length: 60 }, (_, minute) => <SelectItem key={minute} value={String(minute)}>{String(minute).padStart(2, '0')}</SelectItem>)}
              </SelectContent></Select></div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Common minutes">{[0, 15, 30, 45].map(minute => <Button type="button" size="sm" variant={parts.minute === minute ? 'default' : 'outline'} key={minute} onClick={() => choose(parts.hour, minute)}>:{String(minute).padStart(2, '0')}</Button>)}</div>
          <p className="text-sm" aria-live="polite">{formatWallTime(value, timeFormat)} · {value} (24-hour)</p>
          <Button type="button" className="w-full" onClick={() => setOpen(false)}>Done</Button>
        </PopoverContent>
      </Popover>
    </div>
    <p id={`${inputId}-help`} className={`mt-1.5 text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`} role={error ? 'alert' : undefined}>{error || help}</p>
  </div>;
}
