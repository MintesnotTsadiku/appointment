import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';

export interface BankAccount {
  bank: string;
  account_name: string;
  account_number: string;
  note?: string | null;
}

const FIELDS: Array<{ key: keyof BankAccount; label: string }> = [
  { key: 'bank', label: 'staff.payments.bankName' },
  { key: 'account_name', label: 'staff.payments.accountName' },
  { key: 'account_number', label: 'staff.payments.accountNumber' },
  { key: 'note', label: 'staff.payments.accountNote' },
];

/** The accounts customers pay into by bank transfer. */
export function BankAccountsEditor({ value, onChange }: { value: BankAccount[]; onChange: (rows: BankAccount[]) => void }) {
  const { t } = useTranslation();
  const update = (index: number, patch: Partial<BankAccount>) => onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="space-y-3" data-qa="payment-accounts">
      {value.map((row, index) => (
        <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          {FIELDS.slice(0, 3).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`account-${index}-${field.key}`}>{t(field.label)}</Label>
              <Input
                id={`account-${index}-${field.key}`}
                data-qa={`payment-account-${field.key}`}
                value={row[field.key] ?? ''}
                onChange={(event) => update(index, { [field.key]: event.target.value })}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="icon" aria-label={t('staff.payments.removeAccount')} onClick={() => onChange(value.filter((_, i) => i !== index))}>
            <Trash2 aria-hidden="true" />
          </Button>
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor={`account-${index}-note`}>{t('staff.payments.accountNote')}</Label>
            <Input id={`account-${index}-note`} value={row.note ?? ''} onChange={(event) => update(index, { note: event.target.value })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" data-qa="payment-add-account" onClick={() => onChange([...value, { bank: '', account_name: '', account_number: '', note: '' }])}>
        <Plus aria-hidden="true" />
        {t('staff.payments.addAccount')}
      </Button>
    </div>
  );
}
