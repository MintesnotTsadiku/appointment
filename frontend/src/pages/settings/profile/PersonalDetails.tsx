import { FormEvent, useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { SettingsSection } from '@/components/settings-layout';
import { ErrorState } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';

type Details = { first_name: string; last_name: string; mobile_no: string };
type Account = Details & { full_name: string; email: string; user_image?: string };

const pick = (account: Account): Details => ({ first_name: account.first_name, last_name: account.last_name, mobile_no: account.mobile_no });

/** The signed-in person's own name and phone, shared by every workspace they belong to. */
export function PersonalDetails() {
  const { t } = useTranslation();
  const { session, reload } = useSession();
  const query = useFrappeGetCall<{ message: Account }>('appointment.scheduler.account.load', undefined, session?.authenticated ? `account-${session.user}` : null);
  const { call: save } = useFrappePostCall<{ message: Account }>('appointment.scheduler.account.save');
  const account = query.data?.message;
  const [draft, setDraft] = useState<Details>({ first_name: '', last_name: '', mobile_no: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) setDraft(pick(account));
  }, [account]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await save({ details: JSON.stringify(draft) });
      await query.mutate(result, false);
      await reload();
      setNotice(t('staff.profile.details.saved'));
    } catch {
      setError(t('staff.profile.details.failed'));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Details) => ({
    id: `account-${key}`,
    value: draft[key],
    maxLength: 140,
    onChange: (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value }),
  });

  return (
    <SettingsSection title={t('staff.profile.details.title')} description={t('staff.profile.details.description')}>
      {query.error ? (
        <ErrorState onRetry={() => void query.mutate()} />
      ) : (
        <form onSubmit={submit} data-qa="account-details">
          <fieldset disabled={saving || query.isLoading || !account} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account-first_name">{t('staff.profile.details.firstName')}</Label>
              <Input {...field('first_name')} required autoComplete="given-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-last_name">{t('staff.profile.details.lastName')}</Label>
              <Input {...field('last_name')} autoComplete="family-name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="account-mobile_no">{t('staff.profile.details.phone')}</Label>
              <Input {...field('mobile_no')} type="tel" autoComplete="tel" />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" data-qa="account-details-save">{saving ? t('staff.profile.details.saving') : t('staff.profile.details.save')}</Button>
              <Button type="button" variant="outline" onClick={() => { if (account) setDraft(pick(account)); setNotice(''); setError(''); }}>
                {t('staff.profile.details.discard')}
              </Button>
            </div>
          </fieldset>
          {notice && <p role="status" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
          {error && (
            <Alert variant="destructive" className="mt-3" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      )}
    </SettingsSection>
  );
}
