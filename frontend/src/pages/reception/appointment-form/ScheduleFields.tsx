import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useTranslation } from '@/lib/i18n';
import { Field } from './fields';
import { DURATION_OPTIONS } from './model';
import { TimeField } from './TimeField';

interface ScheduleFieldsProps {
  idPrefix: string;
  qaPrefix: string;
  date: string;
  startTime: string;
  duration: string;
  onChange: (patch: { appointment_date?: string; start_time?: string; duration?: string }) => void;
  /** Native time input that accepts any minute; the create dialog always allowed that. */
  freeTime?: boolean;
}

/** Date, start time and duration row shared by the create and edit dialogs. */
export function ScheduleFields({ idPrefix, qaPrefix, date, startTime, duration, onChange, freeTime = false }: ScheduleFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
      <DateField id={`${idPrefix}-date`} value={date} onValueChange={(value) => onChange({ appointment_date: value })} />
      {freeTime ? (
        <FreeTimeField id={`${idPrefix}-time`} qa={`${qaPrefix}-input`} value={startTime} onValueChange={(value) => onChange({ start_time: value })} />
      ) : (
        <TimeField id={`${idPrefix}-time`} qaPrefix={qaPrefix} value={startTime} onValueChange={(value) => onChange({ start_time: value })} />
      )}
      <DurationField id={`${idPrefix}-duration`} value={duration} onValueChange={(value) => onChange({ duration: value })} />
    </div>
  );
}

function DateField({ id, value, onValueChange }: { id: string; value: string; onValueChange: (value: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  return (
    <Field id={id} label={t('staff.receptionDesk.date')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="w-full justify-between px-3 font-normal">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{selected ? format(selected, 'PPP') : t('staff.receptionDesk.pickDate')}</span>
            </span>
            <ChevronDown className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (!day) return;
              onValueChange(format(day, 'yyyy-MM-dd'));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function FreeTimeField({ id, qa, value, onValueChange }: { id: string; qa: string; value: string; onValueChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <Field id={id} label={t('staff.receptionDesk.startTime')}>
      <Input id={id} data-qa={qa} type="time" required className="tabular-nums" value={value} onChange={(event) => onValueChange(event.target.value)} />
    </Field>
  );
}

function DurationField({ id, value, onValueChange }: { id: string; value: string; onValueChange: (value: string) => void }) {
  const { t } = useTranslation();
  const minutes = t('staff.receptionDesk.min');
  // Keep an existing non-standard length (e.g. 20 min) selectable.
  const options = !value || DURATION_OPTIONS.includes(value) ? DURATION_OPTIONS : [...DURATION_OPTIONS, value].sort((a, b) => Number(a) - Number(b));
  return (
    <Field id={id} label={t('staff.receptionDesk.duration')}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="tabular-nums">
              {option} {minutes}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
