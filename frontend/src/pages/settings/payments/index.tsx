import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Switch } from '@/components/switch';
import { FieldHint, SettingsPage, SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { ErrorState, ListSkeleton } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { BankAccountsEditor, type BankAccount } from './BankAccountsEditor';

const API = 'appointment.scheduler.payments';

interface PaymentSettings {
  require_payment: number;
  accept_bank_transfer: number;
  accept_chapa: number;
  bank_accounts: BankAccount[];
  chapa_configured: boolean;
  collector: 'Business' | 'Platform';
}

interface Draft extends PaymentSettings {
  chapa_secret_key: string;
  chapa_webhook_secret: string;
}

const toDraft = (settings: PaymentSettings): Draft => ({ ...settings, chapa_secret_key: '', chapa_webhook_secret: '' });

/** How this business takes payment at booking: the rule, bank accounts and Chapa. */
export default function PaymentSettingsPage() {
  const { t } = useTranslation();
  const organization = useSession().session?.selected?.organization;
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: PaymentSettings }>(
    `${API}.get_settings`,
    organization ? { organization } : undefined,
    organization ? `payment-settings-${organization}` : null
  );
  const { call, loading: saving } = useFrappePostCall<{ message: PaymentSettings }>(`${API}.save_settings`);
  const saved = data?.message;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingKeys, setEditingKeys] = useState(false);
  useEffect(() => {
    if (saved) setDraft(toDraft(saved));
  }, [saved]);
  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(toDraft(saved)));
  const patch = (next: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...next } : current));
  const webhook = `${window.location.origin}/api/method/appointment.scheduler.payments_chapa.webhook`;

  async function save() {
    if (!draft || !organization) return;
    try {
      await call({
        organization,
        require_payment: draft.require_payment,
        accept_bank_transfer: draft.accept_bank_transfer,
        accept_chapa: draft.accept_chapa,
        bank_accounts: JSON.stringify(draft.bank_accounts),
        chapa_secret_key: draft.chapa_secret_key || undefined,
        chapa_webhook_secret: draft.chapa_webhook_secret || undefined,
      });
      toast.success(t('staff.payments.saved'));
      setEditingKeys(false);
      await mutate();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.paymentsExtra.saveFailed'));
    }
  }

  return (
    <SettingsPage title={t('staff.payments.navTitle')} description={t('staff.payments.navDescription')}>
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading || !draft ? (
        <ListSkeleton count={4} />
      ) : (
        <div className="space-y-6" data-qa="payment-settings">
          <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {draft.collector === 'Platform' ? t('staff.payments.collectorPlatform') : t('staff.payments.collectorBusiness')}
          </p>
          <SettingsSection title={t('staff.payments.requireTitle')} description={t('staff.payments.requireHint')}
            aside={<Switch data-qa="payment-require" checked={draft.require_payment === 1} onCheckedChange={(on) => patch({ require_payment: on ? 1 : 0 })} aria-label={t('staff.payments.requireTitle')} />}>
            <Link to="/settings/manage" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {t('staff.paymentsExtra.policiesLink')}
            </Link>
          </SettingsSection>
          {draft.collector === 'Business' && (
            <>
              <SettingsSection title={t('payments.bank')}
                aside={<Switch data-qa="payment-accept-bank" checked={draft.accept_bank_transfer === 1} onCheckedChange={(on) => patch({ accept_bank_transfer: on ? 1 : 0 })} aria-label={t('staff.payments.acceptBank')} />}>
                <BankAccountsEditor value={draft.bank_accounts} onChange={(bank_accounts) => patch({ bank_accounts })} />
              </SettingsSection>
              <SettingsSection title="Chapa" description={t('payments.chapaHint')}
                aside={<Switch data-qa="payment-accept-chapa" checked={draft.accept_chapa === 1} onCheckedChange={(on) => patch({ accept_chapa: on ? 1 : 0 })} aria-label={t('staff.payments.acceptChapa')} />}>
                {/* Secret inputs appear only while someone sets or replaces the keys. */}
                {draft.accept_chapa === 1 && draft.chapa_configured && !editingKeys ? (
                  <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {t('staff.paymentsExtra2.keysSaved')}
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingKeys(true)}>
                      {t('staff.paymentsExtra2.replaceKeys')}
                    </Button>
                  </p>
                ) : draft.accept_chapa === 1 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SecretField id="chapa-secret" label={t('staff.payments.secretKey')} saved={draft.chapa_configured} value={draft.chapa_secret_key} onChange={(chapa_secret_key) => patch({ chapa_secret_key })} />
                    <SecretField id="chapa-webhook" label={t('staff.payments.webhookSecret')} saved={draft.chapa_configured} value={draft.chapa_webhook_secret} onChange={(chapa_webhook_secret) => patch({ chapa_webhook_secret })} />
                  </div>
                ) : null}
                <FieldHint>
                  <span className="break-all">{t('staff.payments.webhookHint').replace('{0}', webhook)}</span>
                </FieldHint>
              </SettingsSection>
            </>
          )}
          <StickySaveBar dirty={dirty} saving={saving} onSave={() => void save()} onDiscard={() => saved && setDraft(toDraft(saved))} saveLabel={t('staff.payments.save')} saveQa="payment-settings-save" disabled={!dirty} />
        </div>
      )}
    </SettingsPage>
  );
}

function SecretField({ id, label, saved, value, onChange }: { id: string; label: string; saved: boolean; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" autoComplete="off" value={value} placeholder={saved ? '••••••••' : ''} onChange={(event) => onChange(event.target.value)} />
      {saved && <FieldHint>{t('staff.payments.keySaved')}</FieldHint>}
    </div>
  );
}
