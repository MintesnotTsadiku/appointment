import type { ReactNode } from 'react';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { FieldHint } from '@/components/settings-layout';
import { Switch } from '@/components/switch';
import { Textarea } from '@/components/textarea';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  id: string;
  label: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  hint?: ReactNode;
  /** Translation key of the validation error. */
  error?: string;
  multiline?: boolean;
  type?: 'text' | 'url' | 'email' | 'number';
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  lang?: string;
  className?: string;
}

/** Label, input and hint or error, wired for screen readers. */
export function TextField({ id, label, value, onChange, hint, error, multiline, type = 'text', className, ...rest }: TextFieldProps) {
  const { t } = useTranslation();
  const described = error || hint ? `${id}-hint` : undefined;
  const common = {
    id,
    value,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': described,
    'data-qa': id,
    className: cn(error && 'border-destructive focus-visible:ring-destructive'),
    ...rest,
  };
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea rows={2} {...common} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input type={type} inputMode={type === 'number' ? 'numeric' : undefined} {...common} onChange={(event) => onChange(event.target.value)} />
      )}
      {error ? <FieldHint id={described} error>{t(error)}</FieldHint> : hint ? <FieldHint id={described}>{hint}</FieldHint> : null}
    </div>
  );
}

/** One on/off setting as a full-width row with a 44 px tap target. */
export function SwitchRow({ id, label, description, checked, onChange, children }: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium">{label}</Label>
          {description && <p className="mt-0.5 text-xs text-muted-foreground" id={`${id}-description`}>{description}</p>}
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={description ? `${id}-description` : undefined} data-qa={id} />
      </div>
      {children && checked && <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

/** An English and Amharic text side by side (stacked on phones). */
export function LanguagePair({ id, label, en, am, onChange, hint, errors, multiline, maxLength }: {
  id: string;
  label: string;
  en: string;
  am: string;
  onChange: (language: 'en' | 'am', value: string) => void;
  hint?: ReactNode;
  errors?: { en?: string; am?: string };
  multiline?: boolean;
  maxLength?: number;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${id}-en`} label={<span className="text-xs text-muted-foreground">{t('staff.brandGrowth.english')}</span>} value={en} lang="en" multiline={multiline} maxLength={maxLength}
          onChange={(value) => onChange('en', value)} error={errors?.en} />
        <TextField id={`${id}-am`} label={<span className="text-xs text-muted-foreground">{t('staff.brandGrowth.amharic')}</span>} value={am} lang="am" multiline={multiline} maxLength={maxLength}
          onChange={(value) => onChange('am', value)} error={errors?.am} />
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </fieldset>
  );
}
