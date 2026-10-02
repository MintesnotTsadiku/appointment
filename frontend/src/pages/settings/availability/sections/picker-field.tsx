import type { ReactNode } from 'react';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { FieldHint } from '@/components/settings-layout';

interface Option { value: string; label: string }

interface PickerFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  hint?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  qa?: string;
  aside?: ReactNode;
}

/** Labelled native select; native keeps the platform picker for long lists and QA `select` actions. */
export function PickerField({ id, label, value, onChange, placeholder, options, hint, disabled, required, qa, aside }: PickerFieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-5 flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        </Label>
        {aside}
      </div>
      <NativeSelect
        id={id}
        data-qa={qa}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}
