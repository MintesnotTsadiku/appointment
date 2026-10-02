import type { ReactNode } from 'react';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useTranslation } from '@/lib/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues = Record<string, any>;

export interface FieldsProps {
  /** Prefix for element ids so create and edit forms never collide. */
  idPrefix: string;
  values: FormValues;
  onChange: (field: string, value: string) => void;
}

export function Field({ id, label, required, children, className }: { id: string; label: ReactNode; required?: boolean; children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={className ? `min-w-0 space-y-1.5 ${className}` : 'min-w-0 space-y-1.5'}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {' '}*
          </span>
        )}
        {required && <span className="sr-only"> ({t('staff.manage.form.required')})</span>}
      </Label>
      {children}
    </div>
  );
}

/** Radix select for short fixed choice lists. */
export function ChoiceSelect({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
