import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { Textarea } from '@/components/textarea';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { ContactFields } from './ContactFields';
import { PreferredProvidersEditor } from './PreferredProvidersEditor';
import { CUSTOMERS_API, type CustomerDetail, type PreferredProvider } from './types';

const DEFAULT_LANGUAGE = 'default';

interface Draft {
  display_name: string;
  primary_email: string;
  primary_phone: string;
  preferred_language: string;
  private_notes: string;
  preferred_providers: PreferredProvider[];
}

function toDraft(customer: CustomerDetail): Draft {
  return {
    display_name: customer.display_name,
    primary_email: customer.primary_email ?? '',
    primary_phone: customer.primary_phone ?? '',
    preferred_language: customer.preferred_language || DEFAULT_LANGUAGE,
    private_notes: customer.private_notes ?? '',
    preferred_providers: customer.preferred_providers ?? [],
  };
}

/** Contact details, language, notes and preferred providers for owners, managers and reception. */
export function CustomerEditor({ customer, organization, onSaved }: { customer: CustomerDetail; organization: string; onSaved: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() => toDraft(customer));
  const { call, loading } = useFrappePostCall(`${CUSTOMERS_API}.save`);
  useEffect(() => setDraft(toDraft(customer)), [customer]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(customer));
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));

  async function save() {
    try {
      await call({
        organization,
        customer_id: customer.name,
        display_name: draft.display_name,
        primary_email: draft.primary_email,
        primary_phone: draft.primary_phone,
        preferred_language: draft.preferred_language === DEFAULT_LANGUAGE ? '' : draft.preferred_language,
        private_notes: draft.private_notes,
        preferred_providers: JSON.stringify(draft.preferred_providers.filter((row) => row.provider)),
      });
      toast.success(t('staff.customers.saved'));
      onSaved();
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.customers.saveFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t('staff.customers.details')}>
        <div className="space-y-4">
          <ContactFields idPrefix="customer" value={draft} onChange={patch} />
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="customer-language">{t('staff.customers.language')}</Label>
            <Select value={draft.preferred_language} onValueChange={(preferred_language) => patch({ preferred_language })}>
              <SelectTrigger id="customer-language" data-qa="customer-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_LANGUAGE}>{t('staff.customers.languageDefault')}</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">አማርኛ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-notes">{t('staff.customers.notes')}</Label>
            <Textarea
              id="customer-notes"
              data-qa="customer-notes"
              rows={3}
              value={draft.private_notes}
              aria-describedby="customer-notes-hint"
              onChange={(event) => patch({ private_notes: event.target.value })}
            />
            <p id="customer-notes-hint" className="text-xs text-muted-foreground">
              {t('staff.customers.notesHint')}
            </p>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title={t('staff.customers.preferred')}>
        <PreferredProvidersEditor organization={organization} value={draft.preferred_providers} onChange={(preferred_providers) => patch({ preferred_providers })} />
      </SettingsSection>
      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => void save()}
        onDiscard={() => setDraft(toDraft(customer))}
        saveLabel={t('staff.customers.save')}
        saveQa="customer-save"
        disabled={!dirty || !draft.display_name.trim()}
      />
    </div>
  );
}
