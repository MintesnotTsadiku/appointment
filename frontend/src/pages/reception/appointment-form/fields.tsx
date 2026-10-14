import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/input';
import { PhoneInput, PhoneTagsInput } from '@/components/phone-input';
import { Label } from '@/components/label';
import { OptionSelect } from '@/components/select/OptionSelect';
import { Textarea } from '@/components/textarea';
import { FieldHint } from '@/components/settings-layout';
import { cn } from '@/lib/utils';

interface FieldProps {
  id: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label, control and inline validation message. */
export function Field({ id, label, error, required, aside, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        </Label>
        {aside}
      </div>
      {children}
      {error && <FieldHint id={`${id}-error`} error>{error}</FieldHint>}
    </div>
  );
}

type InputProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange'>;

interface TextFieldProps extends InputProps {
  id: string;
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function TextField({ id, label, value, onValueChange, error, required, className, ...props }: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error} required={required} className={className}>
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Field>
  );
}

interface PhoneFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  help?: ReactNode;
  'data-qa'?: string;
}

/** The standard phone input inside a desk field; the form's validation shows the shared hint. */
export function PhoneField({ id, label, value, onValueChange, error, required, className, help, 'data-qa': qa }: PhoneFieldProps) {
  return (
    <Field id={id} label={label} error={error} required={required} className={className}>
      <PhoneInput id={id} data-qa={qa} value={value} onChange={onValueChange} required={required} messages={false}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined} />
      {!error && help && <FieldHint id={`${id}-help`}>{help}</FieldHint>}
    </Field>
  );
}

interface PhoneTagsFieldProps {
  id: string;
  label: ReactNode;
  value: string[];
  onValueChange: (value: string[]) => void;
  onValidityChange?: (valid: boolean) => void;
  exclude?: string;
  help?: ReactNode;
  className?: string;
  'data-qa'?: string;
}

/** Other people coming, as phone tags. */
export function PhoneTagsField({ id, label, value, onValueChange, onValidityChange, exclude, help, className, 'data-qa': qa }: PhoneTagsFieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
      <PhoneTagsInput id={id} data-qa={qa} aria-labelledby={`${id}-label`} value={value} onChange={onValueChange}
        onValidityChange={onValidityChange} exclude={exclude} help={help} helpClassName="text-xs" errorClassName="text-xs" />
    </div>
  );
}

interface OptionFieldProps<T> {
  id: string;
  label: ReactNode;
  placeholder: string;
  value: string;
  options: T[];
  optionLabel: (option: T) => string;
  onValueChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

/** Standard dropdown over named records. */
export function OptionField<T extends { name: string }>({
  id,
  label,
  placeholder,
  value,
  options,
  optionLabel,
  onValueChange,
  error,
  required,
  className,
}: OptionFieldProps<T>) {
  return (
    <Field id={id} label={label} error={error} required={required} className={className}>
      <OptionSelect
        id={id}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        options={options.map((option) => ({ value: option.name, label: optionLabel(option) }))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

interface NotesFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  placeholder: string;
  rows?: number;
  onValueChange: (value: string) => void;
}

export function NotesField({ id, label, value, placeholder, rows = 3, onValueChange }: NotesFieldProps) {
  return (
    <Field id={id} label={label}>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-h-0 resize-none"
      />
    </Field>
  );
}
