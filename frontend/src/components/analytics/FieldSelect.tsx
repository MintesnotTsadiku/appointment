import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Label } from '@/components/label';
import { cn } from '@/lib/utils';

export function FieldSelect({
  value,
  onValueChange,
  options,
  label,
  className,
  triggerClassName,
  'aria-label': ariaLabel,
  'data-qa': dataQa,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
  triggerClassName?: string;
  'aria-label'?: string;
  'data-qa'?: string;
  disabled?: boolean;
}) {
  const name = ariaLabel || label;
  return (
    <div className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {label ? <Label className="shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</Label> : null}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={name} data-qa={dataQa} className={cn('h-8 w-auto min-w-[7.5rem]', triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
