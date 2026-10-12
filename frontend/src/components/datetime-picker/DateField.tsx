import { DatePicker } from './DatePicker';

/** An optional date filter: the standard date picker with a clear button. Values stay local `YYYY-MM-DD` dates. */
export function DateField({ value, onValueChange, id, min, max, disabled, placeholder, className, ...aria }: {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  'data-qa'?: string;
}) {
  return <DatePicker value={value} onValueChange={onValueChange} id={id} min={min} max={max} disabled={disabled} placeholder={placeholder ?? aria['aria-label']}
    className={className ?? 'mt-1'} clearable aria-label={aria['aria-label']} data-qa={aria['data-qa']} />;
}
