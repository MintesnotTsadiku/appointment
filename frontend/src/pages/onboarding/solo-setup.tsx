import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { useSession } from '@/context/session';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export default function SoloSetup() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [error, setError] = useState('');
  const { call, loading } = useFrappePostCall('appointment.public_experience.solo_setup.create');
  const { reload } = useSession();
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await call({ business_name: name, timezone }); await reload(); navigate('/settings/independent-booking'); }
    catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border p-6">
    <p>{t('staff.onboarding.solo.intro')}</p>
    <label className="block">{t('staff.onboarding.solo.name')}<Input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
    <TimeZoneSelect value={timezone} onChange={setTimezone} />
    {error && <p role="alert">{error}</p>}
    <Button type="submit" disabled={loading}>{loading ? t('staff.form.saving') : t('staff.onboarding.solo.submit')}</Button>
  </form>;
}
