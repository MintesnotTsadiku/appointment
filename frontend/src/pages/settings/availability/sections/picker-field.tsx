import type { ReactNode } from 'react';
import { Label } from '@/components/label';
import { OptionSelect } from '@/components/select/OptionSelect';
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

/** Labelled standard dropdown. */
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
      <OptionSelect
        id={id}
        data-qa={qa}
        value={value}
        onValueChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}
