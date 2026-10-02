import { useId, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import { CUSTOMERS_API, type CustomerSummary, type SearchResult } from './types';
import { useDebounced } from './useDebounced';

interface CustomerPickerProps {
  organization?: string;
  value: CustomerSummary | null;
  onChange: (customer: CustomerSummary | null) => void;
  /** Hides this customer from the results (merge target picking). */
  excludeId?: string;
  label?: string;
  hint?: string;
  qa?: string;
}

/** Search-as-you-type picker over the business's customers. */
export function CustomerPicker({ organization, value, onChange, excludeId, label, hint, qa = 'customer-picker' }: CustomerPickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [text, setText] = useState('');
  const query = useDebounced(text.trim(), 250);
  const enabled = Boolean(organization && query.length >= 2 && !value);
  const { data } = useFrappeGetCall<{ message: SearchResult }>(
    `${CUSTOMERS_API}.search`,
    { organization, query },
    enabled ? `customer-picker-${organization}-${query}` : null
  );
  const results = (data?.message?.customers ?? []).filter((row) => row.name !== excludeId).slice(0, 6);

  if (value) {
    return (
      <div data-qa={qa} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span data-qa={`${qa}-linked`} className="min-w-0 truncate text-foreground">
          {t('staff.customers.pickerLinked').replace('{0}', value.display_name)}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X aria-hidden="true" />
          {t('staff.customers.pickerClear')}
        </Button>
      </div>
    );
  }

  return (
    <div data-qa={qa} className="space-y-1.5">
      <Label htmlFor={inputId}>{label ?? t('staff.customers.pickerLabel')}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          data-qa={`${qa}-search`}
          className="pl-9"
          autoComplete="off"
          placeholder={t('staff.customers.pickerPlaceholder')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-controls={`${inputId}-results`}
        />
      </div>
      {results.length > 0 && (
        <ul id={`${inputId}-results`} aria-label={label ?? t('staff.customers.pickerLabel')} className="divide-y rounded-lg border text-sm">
          {results.map((row) => (
            <li key={row.name}>
              <button
                type="button"
                data-qa={`${qa}-option`}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => {
                  onChange(row);
                  setText('');
                }}
              >
                <span className="font-medium text-foreground">{row.display_name}</span>
                <span className="text-xs text-muted-foreground">{[row.primary_phone, row.primary_email].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

