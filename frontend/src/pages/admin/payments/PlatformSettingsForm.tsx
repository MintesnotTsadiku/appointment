import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { FieldHint, SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { BankAccountsEditor } from '@/pages/settings/payments/BankAccountsEditor';
import { API, type CollectionMode, type FeeType, type PlatformSettings } from './types';

interface Draft extends PlatformSettings {
  chapa_secret_key: string;
  chapa_webhook_secret: string;
}

const toDraft = (settings: PlatformSettings): Draft => ({ ...settings, chapa_secret_key: '', chapa_webhook_secret: '' });

/** Platform defaults: who collects, the fee, the free allowance, and the platform's own accounts. */
export function PlatformSettingsForm({ saved, onSaved }: { saved: PlatformSettings; onSaved: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [editingKeys, setEditingKeys] = useState(false);
  const { call, loading } = useFrappePostCall(`${API}.save_platform`);
  useEffect(() => setDraft(toDraft(saved)), [saved]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(saved));
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));

  async function save() {
    try {
      await call({
        collection_mode: draft.collection_mode,
        platform_fee_type: draft.platform_fee_type,
        platform_fee_value: draft.platform_fee_value,
        free_bookings: draft.free_bookings,
        platform_bank_accounts: JSON.stringify(draft.platform_bank_accounts),
        chapa_secret_key: draft.chapa_secret_key || undefined,
        chapa_webhook_secret: draft.chapa_webhook_secret || undefined,
      });
      toast.success(t('staff.adminPayments.saved'));
      setEditingKeys(false);
      onSaved();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.adminPayments.saveFailed'));
    }
  }

  return (
    <div className="space-y-6" data-qa="admin-platform-settings">
      <SettingsSection title={t('staff.adminPayments.collectionTitle')} description={t('staff.adminPayments.collectionHint')}>
        <NativeSelect aria-label={t('staff.adminPayments.whoCollects')} data-qa="admin-platform-collects" value={draft.collection_mode} onChange={(event) => patch({ collection_mode: event.target.value as CollectionMode })}>
          <option value="Business collects">{t('staff.adminPayments.modeBusiness')}</option>
          <option value="Platform collects">{t('staff.adminPayments.modePlatform')}</option>
        </NativeSelect>
      </SettingsSection>
      <SettingsSection title={t('staff.adminPayments.typeFee')} description={t('staff.adminPayments.feeHint')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="platform-fee-type">{t('staff.adminPayments.feeType')}</Label>
            <NativeSelect id="platform-fee-type" data-qa="admin-platform-fee-type" value={draft.platform_fee_type} onChange={(event) => patch({ platform_fee_type: event.target.value as FeeType })}>
              <option value="None">{t('staff.adminPayments.feeNone')}</option>
              <option value="Fixed">{t('staff.adminPayments.feeFixed')}</option>
              <option value="Percent">{t('staff.adminPayments.feePercent')}</option>
            </NativeSelect>
          </div>
          {draft.platform_fee_type !== 'None' && (
            <div className="space-y-1.5">
              <Label htmlFor="platform-fee-value">{t('staff.adminPayments.feeValue')} ({draft.platform_fee_type === 'Percent' ? '%' : 'ETB'})</Label>
              <Input id="platform-fee-value" data-qa="admin-platform-fee-value" type="number" min={0} step="0.01" inputMode="decimal" value={draft.platform_fee_value}
                onChange={(event) => patch({ platform_fee_value: Number(event.target.value) })} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="platform-free">{t('staff.adminPayments.freeBookings')}</Label>
            <Input id="platform-free" data-qa="admin-platform-free" type="number" min={0} step={1} inputMode="numeric" value={draft.free_bookings}
              onChange={(event) => patch({ free_bookings: Math.max(0, Math.trunc(Number(event.target.value))) })} />
          </div>
        </div>
        <FieldHint>{t('staff.adminPayments.freeHint')}</FieldHint>
      </SettingsSection>
      <SettingsSection title={t('staff.adminPayments.platformAccounts')} description={t('staff.adminPayments.platformAccountsHint')}>
        <BankAccountsEditor value={draft.platform_bank_accounts} onChange={(platform_bank_accounts) => patch({ platform_bank_accounts })} />
      </SettingsSection>
      <SettingsSection title={t('staff.adminPayments.chapaTitle')} description={t('staff.adminPayments.chapaHint')}>
        {/* Secret inputs appear only while someone sets or replaces the keys. */}
        {editingKeys ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="platform-chapa-secret">{t('staff.payments.secretKey')}</Label>
              <Input id="platform-chapa-secret" type="password" autoComplete="off" value={draft.chapa_secret_key} onChange={(event) => patch({ chapa_secret_key: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform-chapa-webhook">{t('staff.payments.webhookSecret')}</Label>
              <Input id="platform-chapa-webhook" type="password" autoComplete="off" value={draft.chapa_webhook_secret} onChange={(event) => patch({ chapa_webhook_secret: event.target.value })} />
            </div>
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {draft.chapa_configured && t('staff.paymentsExtra2.keysSaved')}
            <Button type="button" variant="outline" size="sm" data-qa="admin-platform-keys" onClick={() => setEditingKeys(true)}>
              {draft.chapa_configured ? t('staff.paymentsExtra2.replaceKeys') : t('staff.adminPayments.setKeys')}
            </Button>
          </p>
        )}
      </SettingsSection>
      <StickySaveBar dirty={dirty} saving={loading} onSave={() => void save()} onDiscard={() => { setDraft(toDraft(saved)); setEditingKeys(false); }}
        saveLabel={t('staff.adminPayments.save')} saveQa="admin-platform-save" disabled={!dirty} />
    </div>
  );
}
