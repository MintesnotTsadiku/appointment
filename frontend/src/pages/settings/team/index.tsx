import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/alert';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { EmptyState } from '@/components/states';
import { Invitations } from './Invitations';
import { MemberList } from './MemberList';
import { AssignForm, type AssignValues } from './AssignForm';
import type { LocationOption, Member, ProviderOption } from './types';

const EMPTY_FORM: AssignValues = { email: '', full_name: '', role: 'Receptionist', provider: '' };

export default function TeamManagement() {
  const { session } = useSession();
  const { t } = useTranslation();
  const managerWorkspaces = useMemo(() => (session?.workspaces ?? []).filter((workspace) => workspace.is_manager), [session]);
  const [organization, setOrganization] = useState<string>('');
  const activeOrg = organization || managerWorkspaces[0]?.organization || '';
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<AssignValues>(EMPTY_FORM);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const membersCall = useFrappeGetCall<{ message: { members: Member[]; owner: string } }>(
    'appointment.scheduler.membership.members',
    activeOrg ? { organization: activeOrg } : undefined,
    activeOrg ? `members-${activeOrg}` : null
  );
  const providersCall = useFrappeGetCall<{ message: ProviderOption[] }>(
    'appointment.scheduler.api.desk.get_providers_list',
    activeOrg ? { organization: activeOrg } : undefined,
    activeOrg ? `team-providers-${activeOrg}` : null
  );
  const locationsCall = useFrappeGetCall<{ message: LocationOption[] }>(
    'appointment.scheduler.membership.location_options',
    { organization: activeOrg },
    activeOrg ? `team-locations-${activeOrg}` : null
  );
  const { call: assign, loading: assigning } = useFrappePostCall('appointment.scheduler.membership.assign_member');
  const { call: revoke } = useFrappePostCall('appointment.scheduler.membership.revoke_member');
  const members = membersCall.data?.message?.members ?? [];

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
      setNotice(
        result?.message?.created_user
          ? `Account created locally and assigned as ${form.role}. No email was sent; an administrator sets its password locally.`
          : `Existing account assigned as ${form.role}. No email was sent.`
      );
      setForm({ ...EMPTY_FORM, role: form.role });
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

  if (!session?.authenticated) {
    return <main className="min-h-screen p-8">Please sign in.</main>;
  }

  return (
    <SettingsPage
      title={t('staff.settings.team.title')}
      headingQa="team-heading"
      description={t('staff.team.description')}
      actions={managerWorkspaces.length > 1 ? (
        <BusinessPicker
          value={activeOrg}
          options={managerWorkspaces.map((w) => ({ value: w.organization, label: w.business_name }))}
          onChange={(value) => {
            setOrganization(value);
            setSelectedLocations([]);
          }}
        />
      ) : undefined}
    >
      <div className="space-y-4">
        {problem && (
          <Alert variant="destructive" data-qa="team-error">
            <AlertTriangle />
            <AlertDescription className="text-foreground">{problem}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert variant="success" role="status" data-qa="team-notice">
            <CheckCircle2 />
            <AlertDescription className="text-foreground">{notice}</AlertDescription>
          </Alert>
        )}
        {!activeOrg ? (
          <EmptyState
            icon={Building2}
            title={t('staff.team.noBusiness')}
            action={<Button asChild size="sm"><Link to="/onboarding">{t('staff.team.setUp')}</Link></Button>}
          />
        ) : (
          <>
          <Invitations organization={activeOrg} />
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <SettingsSection
              title={t('staff.team.members')}
              aside={<Badge variant="muted" className="tabular-nums">{members.length}</Badge>}
              className="[&>div]:p-0"
            >
              <MemberList members={members} loading={membersCall.isLoading} error={membersCall.error} onRetry={() => void membersCall.mutate()} onRevoke={(member) => void onRevoke(member)} />
            </SettingsSection>
            <SettingsSection title={t('staff.team.assignTitle')} description={t('staff.team.assignDescription')} className="lg:sticky lg:top-16">
              <AssignForm
                form={form}
                onChange={setForm}
                locations={locationsCall.data?.message ?? []}
                selectedLocations={selectedLocations}
                onLocationsChange={setSelectedLocations}
                providers={providersCall.data?.message ?? []}
                assigning={assigning}
                onSubmit={submit}
              />
            </SettingsSection>
          </div>
          </>
        )}
      </div>
    </SettingsPage>
  );
}

function BusinessPicker({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="w-full min-w-[220px] sm:w-auto">
      <Label htmlFor="team-business" className="sr-only">{t('staff.team.business')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="team-business" data-qa="team-business-select"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
