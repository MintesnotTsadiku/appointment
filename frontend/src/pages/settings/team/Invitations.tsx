import { FormEvent, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { ExternalLink, MailPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';

interface Invitation {
  name: string;
  email: string;
  status: string;
  acceptance_path?: string;
}

const API = 'appointment.content.staff_invitations';

/** Local staff invitations: the invitee chooses their own password, then a manager assigns their role. */
export function Invitations({ organization }: { organization: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { call: invite, loading } = useFrappePostCall(`${API}.invite`);
  const { call: revoke } = useFrappePostCall(`${API}.revoke`);
  const inbox = useFrappeGetCall<{ message: { invitations: Invitation[] } }>(`${API}.inbox`, { organization }, `staff-invitations-${organization}`);
  const invitations = inbox.data?.message.invitations ?? [];

  const fail = (reason: unknown) => setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0]) || t('staff.team.invite.failed'));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await invite({ organization, staff_email: email.trim(), full_name: name.trim() });
      setEmail('');
      setName('');
      await inbox.mutate();
    } catch (reason) {
      fail(reason);
    }
  };

  const cancel = async (invitation: string) => {
    setError('');
    try {
      await revoke({ invitation });
      await inbox.mutate();
    } catch (reason) {
      fail(reason);
    }
  };

  return (
    <SettingsSection title={t('staff.team.invite.title')} description={t('staff.team.invite.description')}>
      <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]" data-qa="team-invite-form">
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">{t('staff.team.fullName')}</Label>
          <Input id="invite-name" data-qa="team-invite-name" required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">{t('staff.team.invite.email')}</Label>
          <Input id="invite-email" data-qa="team-invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <Button type="submit" data-qa="team-invite-send" disabled={loading || !email.trim() || !name.trim()}>
          <MailPlus className="h-4 w-4" aria-hidden="true" />
          {t('staff.team.invite.send')}
        </Button>
      </form>
      {error && (
        <Alert variant="destructive" className="mt-4" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {invitations.length > 0 && (
        <ul className="mt-4 divide-y rounded-lg border" data-qa="team-invitations">
          {invitations.map((row) => (
            <li key={row.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm" data-qa="team-invitation" data-qa-state={row.status}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{row.email}</span>
                <Badge variant="muted">{row.status}</Badge>
              </span>
              <span className="flex items-center gap-2">
                {row.acceptance_path && (
                  <Button asChild size="sm" variant="outline">
                    <a href={row.acceptance_path} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {t('staff.team.invite.open')}
                    </a>
                  </Button>
                )}
                {row.status === 'Pending' && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void cancel(row.name)}>
                    {t('staff.team.invite.revoke')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
