import { FormEvent, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { parseFrappeErrorMsg } from '@/lib/utils';

interface Invitation { name: string; email: string; status: string; acceptance_path?: string }

export default function TeamInvitations({ organization }: { organization: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { call: invite, loading } = useFrappePostCall('appointment.content.staff_invitations.invite');
  const { call: revoke } = useFrappePostCall('appointment.content.staff_invitations.revoke');
  const inbox = useFrappeGetCall<{ message: { invitations: Invitation[] } }>(
    'appointment.content.staff_invitations.inbox', { organization }, `staff-invitations-${organization}`);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await invite({ organization, staff_email: email, full_name: name });
      setEmail(''); setName(''); await inbox.mutate();
    } catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  async function cancel(invitation: string) {
    try { await revoke({ invitation }); await inbox.mutate(); }
    catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  return <section className="mb-6 space-y-4 rounded-2xl border p-5" aria-label="Staff invitations">
    <h2 className="text-xl font-semibold">Invite staff</h2>
    <p>Review and create a local invitation. No external email is sent. The staff member chooses their own password; you assign their role and scope after acceptance.</p>
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label>Name<Input required value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Email<Input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <Button type="submit" disabled={loading}>Confirm local invitation</Button>
    </form>
    {error && <p role="alert">{error}</p>}
    <ul>{inbox.data?.message.invitations.map(row => <li className="flex flex-wrap gap-3 py-2" key={row.name}>
      <span>{row.email} · {row.status}</span>
      {row.acceptance_path && <a href={row.acceptance_path} target="_blank" rel="noreferrer" className="underline">Open local invitation</a>}
      {row.status === 'Pending' && <Button variant="ghost" onClick={() => void cancel(row.name)}>Revoke invitation</Button>}
    </li>)}</ul>
  </section>;
}
