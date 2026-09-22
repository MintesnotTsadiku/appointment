import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Info, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import AppTopNav from '@/components/workspace/AppTopNav';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useSession } from '@/context/session';
import { parseFrappeErrorMsg } from '@/lib/utils';

interface Member {
  name: string;
  user: string;
  full_name: string;
  enabled: boolean;
  membership_role: string;
  status: string;
  provider: string | null;
  provider_name: string | null;
  locations: Array<{ name: string; label: string }>;
  assigned_at: string | null;
}

interface Options {
  message: Array<{ name: string; provider_name?: string }>;
}

const ROLE_OPTIONS = [
  { value: 'Manager', label: 'Manager', help: 'Business setup, publication, team and oversight.' },
  { value: 'Provider', label: 'Provider', help: 'Sees and manages appointments permitted by their scope.' },
  { value: 'Receptionist', label: 'Receptionist', help: 'Manages permitted appointments for assigned scope.' },
];

export default function TeamManagement() {
  const { session } = useSession();
  const managerWorkspaces = useMemo(
    () => (session?.workspaces ?? []).filter((workspace) => workspace.is_manager),
    [session]
  );
  const [organization, setOrganization] = useState<string>('');
  const activeOrg = organization || managerWorkspaces[0]?.organization || '';

  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ email: '', full_name: '', role: 'Receptionist', provider: '' });
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const membersCall = useFrappeGetCall<{ message: { members: Member[]; owner: string } }>(
    'appointment.scheduler.membership.members',
    activeOrg ? { organization: activeOrg } : undefined,
    activeOrg ? `members-${activeOrg}` : null
  );
  const providersCall = useFrappeGetCall<Options>(
    'appointment.scheduler.api.desk.get_providers_list',
    activeOrg ? { organization: activeOrg } : undefined,
    activeOrg ? `team-providers-${activeOrg}` : null
  );
  const locationsCall = useFrappeGetCall<{ message: Array<{ name: string; location_name: string }> }>(
    'appointment.scheduler.membership.location_options',
    { organization: activeOrg },
    activeOrg ? `team-locations-${activeOrg}` : null
  );

  const { call: assign, loading: assigning } = useFrappePostCall('appointment.scheduler.membership.assign_member');
  const { call: revoke } = useFrappePostCall('appointment.scheduler.membership.revoke_member');

  const members = membersCall.data?.message?.members ?? [];
  const providerOptions = providersCall.data?.message ?? [];
  const locationOptions = locationsCall.data?.message ?? [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    setNotice('');
    try {
      const result = await assign({
        organization: activeOrg,
        email: form.email,
        membership_role: form.role,
        provider: form.provider || undefined,
        locations: JSON.stringify(selectedLocations),
        full_name: form.full_name || undefined,
      });
      const payload = result?.message;
      setNotice(
        payload?.created_user
          ? `Account created locally and assigned as ${form.role}. No email was sent; an administrator sets its password locally.`
          : `Existing account assigned as ${form.role}. No email was sent.`
      );
      setForm({ email: '', full_name: '', role: form.role, provider: '' });
      setSelectedLocations([]);
      membersCall.mutate();
    } catch (error) {
      setProblem(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  async function onRevoke(member: Member) {
    setProblem('');
    setNotice('');
    try {
      await revoke({ membership: member.name });
      setNotice(`${member.full_name} can no longer access this business.`);
      membersCall.mutate();
    } catch (error) {
      setProblem(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  const inputStyle = { borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' } as const;

  if (!session?.authenticated) {
    return <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>Please sign in.</main>;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AppTopNav active="settings" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 data-qa="team-heading" className="font-heading text-3xl font-bold">Team access</h1>
            <p className="mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Assign existing accounts to a business and scope. This is local account assignment; no invitation email is
              sent and global roles alone never grant access to another business.
            </p>
          </div>
          {managerWorkspaces.length > 1 && (
            <div className="min-w-[220px]">
              <Label className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Business</Label>
              <Select
                value={activeOrg}
                onValueChange={(value) => {
                  setOrganization(value);
                  setSelectedLocations([]);
                }}
              >
                <SelectTrigger data-qa="team-business-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {managerWorkspaces.map((workspace) => (
                    <SelectItem key={workspace.organization} value={workspace.organization}>
                      {workspace.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        {!activeOrg && (
          <p role="alert" className="rounded-lg p-4" style={{ backgroundColor: 'var(--border-subtle)' }}>
            You do not manage a business yet. <Link to="/onboarding" className="underline">Set one up</Link>.
          </p>
        )}

        {problem && <p role="alert" data-qa="team-error" className="mb-4 rounded-lg p-3" style={{ backgroundColor: 'var(--status-cancelled-bg, #fee2e2)', color: 'var(--status-cancelled, #b91c1c)' }}>{problem}</p>}
        {notice && <p role="status" data-qa="team-notice" className="mb-4 rounded-lg p-3" style={{ backgroundColor: 'var(--status-confirmed-bg, #dcfce7)', color: 'var(--status-confirmed, #166534)' }}>{notice}</p>}

        {activeOrg && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section aria-label="Members" className="rounded-2xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
              <h2 className="flex items-center gap-2 border-b px-5 py-3 font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
                <Users className="h-4 w-4" /> Members
              </h2>
              <ul data-qa="team-members">
                {membersCall.isLoading && <li className="p-5" role="status">Loading members…</li>}
                {!membersCall.isLoading && members.length === 0 && (
                  <li className="p-5" style={{ color: 'var(--text-muted)' }}>No members yet.</li>
                )}
                {members.map((member) => (
                  <li key={member.name} data-qa="team-member" className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <p className="font-medium">
                        {member.full_name}
                        {!member.enabled && <span className="ml-2 text-xs" style={{ color: 'var(--status-cancelled, #b91c1c)' }}>disabled</span>}
                        {member.status !== 'Active' && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({member.status})</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.user}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                          <ShieldCheck className="h-3 w-3" /> {member.membership_role}
                        </span>
                        {member.provider_name && <span style={{ color: 'var(--text-muted)' }}>· {member.provider_name}</span>}
                        {member.locations.length > 0 && <span style={{ color: 'var(--text-muted)' }}>· {member.locations.map((loc) => loc.label).join(', ')}</span>}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void onRevoke(member)} disabled={member.status !== 'Active'}>
                      <Trash2 className="mr-1 h-4 w-4" /> Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Assign staff" className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4" /> Assign staff</h2>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="team-email" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Account email</Label>
                  <Input id="team-email" data-qa="team-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <Label htmlFor="team-name" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full name (for new accounts)</Label>
                  <Input id="team-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <Label className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value, provider: '' })}>
                    <SelectTrigger data-qa="team-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{ROLE_OPTIONS.find((option) => option.value === form.role)?.help}</p>
                </div>
                {(form.role === 'Provider' || form.role === 'Receptionist') && providerOptions.length > 0 && (
                  <div>
                    <Label className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Provider scope (optional)</Label>
                    <Select value={form.provider || '__all__'} onValueChange={(value) => setForm({ ...form, provider: value === '__all__' ? '' : value })}>
                      <SelectTrigger data-qa="team-provider"><SelectValue placeholder="All providers" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All providers</SelectItem>
                        {providerOptions.map((provider) => (
                          <SelectItem key={provider.name} value={provider.name}>{provider.provider_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {locationOptions.length > 0 && (
                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Location scope</legend>
                    <div className="space-y-1">
                      {locationOptions.map((location) => (
                        <label key={location.name} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            data-qa={`team-location-${location.name}`}
                            checked={selectedLocations.includes(location.name)}
                            onChange={(e) => setSelectedLocations(e.target.checked ? [...selectedLocations, location.name] : selectedLocations.filter((name) => name !== location.name))}
                          />
                          {location.location_name}
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Empty means every location in this business.</p>
                  </fieldset>
                )}
                <div>
                  <p className="flex items-start gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Info className="mt-0.5 h-3 w-3 shrink-0" /> Local account assignment only. No email is delivered in this
                    environment; new accounts are created without a password and an administrator sets one locally.
                  </p>
                </div>
                <Button type="submit" data-qa="team-assign" disabled={assigning || !form.email}>
                  <Plus className="mr-1 h-4 w-4" /> {assigning ? 'Assigning…' : 'Assign'}
                </Button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
