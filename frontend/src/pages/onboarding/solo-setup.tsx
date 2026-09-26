import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { useSession } from '@/context/session';
import { parseFrappeErrorMsg } from '@/lib/utils';

export default function SoloSetup() {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [error, setError] = useState('');
  const { call, loading } = useFrappePostCall('appointment.public_experience.solo_setup.create');
  const { reload } = useSession();
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await call({ business_name: name, timezone }); await reload(); navigate('/settings/website'); }
    catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border p-6">
    <p>Set up your independent business and public website. Review booking availability before sharing an appointment link.</p>
    <label className="block">Independent business name<Input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
    <TimeZoneSelect value={timezone} onChange={setTimezone} />
    {error && <p role="alert">{error}</p>}
    <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Continue as independent provider'}</Button>
  </form>;
}
