import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { callMethod } from '@/public-experience/api';

export default function StaffInvitation() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function accept(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await callMethod<{ message: string }>('appointment.content.staff_invitations.accept',
        { invitation_token: token, password });
      setPassword(''); setMessage(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This invitation is unavailable.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-5 p-8">
    <h1 className="text-3xl font-semibold">Accept staff invitation</h1>
    <p>Create your own account password. If you already have an account, sign in with the invited email first; accepting does not change its password. Your owner assigns business access separately.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!message && <form onSubmit={accept} className="space-y-4">
      <label className="block">New account password<input className="block w-full rounded border p-3" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="rounded border px-5 py-3" disabled={busy}>{busy ? 'Accepting…' : 'Accept invitation'}</button>
    </form>}
    <a href="/login" className="underline">Sign in</a>
  </main>;
}
