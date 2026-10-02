import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';

export interface ContactDraft {
  display_name: string;
  primary_email: string;
  primary_phone: string;
}

interface ContactFieldsProps {
  idPrefix: string;
  value: ContactDraft;
  nameError?: string;
  onChange: (patch: Partial<ContactDraft>) => void;
}

/** Name (required), phone and email inputs shared by create and edit. */
export function ContactFields({ idPrefix, value, nameError, onChange }: ContactFieldsProps) {
  const { t } = useTranslation();
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id('name')}>
          {t('staff.customers.name')} <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={id('name')}
          data-qa={`${idPrefix}-name`}
          required
          autoComplete="off"
          value={value.display_name}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? id('name-error') : undefined}
          onChange={(event) => onChange({ display_name: event.target.value })}
        />
        {nameError && (
          <p id={id('name-error')} role="alert" className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('phone')}>{t('staff.customers.phone')}</Label>
        <Input
          id={id('phone')}
          data-qa={`${idPrefix}-phone`}
          type="tel"
          placeholder="+251 9XX XXX XXX"
          value={value.primary_phone}
          onChange={(event) => onChange({ primary_phone: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('email')}>{t('staff.customers.email')}</Label>
        <Input
          id={id('email')}
          data-qa={`${idPrefix}-email`}
          type="email"
          placeholder="name@example.com"
          value={value.primary_email}
          onChange={(event) => onChange({ primary_email: event.target.value })}
        />
      </div>
    </div>
  );
}
