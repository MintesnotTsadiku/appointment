import { ShieldCheck, Trash2, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Avatar, AvatarFallback } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/alert-dialog';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useRoleLabel } from '@/components/staff-shell';
import { initialsOf } from '@/components/staff-shell/UserMenu';
import type { Member } from './types';

interface MemberListProps {
  members: Member[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onRevoke: (member: Member) => void;
}

export function MemberList({ members, loading, error, onRetry, onRevoke }: MemberListProps) {
  const { t } = useTranslation();
  if (loading) return <ListSkeleton count={4} className="p-4" />;
  if (error) return <ErrorState onRetry={onRetry} className="m-4" />;
  if (!members.length) return <EmptyState icon={Users} title={t('staff.team.noMembers')} description={t('staff.team.noMembersHint')} className="m-4" />;
  return (
    <ul data-qa="team-members" className="divide-y">
      {members.map((member) => (
        <MemberRow key={member.name} member={member} onRevoke={onRevoke} />
      ))}
    </ul>
  );
}

function MemberRow({ member, onRevoke }: { member: Member; onRevoke: (member: Member) => void }) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const scope = [member.provider_name, member.locations.map((loc) => loc.label).join(', ')].filter(Boolean).join(' · ');
  return (
    <li data-qa="team-member" className="flex flex-wrap items-center gap-3 px-5 py-4">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">{initialsOf(member.full_name || member.user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{member.full_name}</span>
          {!member.enabled && <Badge variant="destructive">{t('staff.team.disabled')}</Badge>}
          {member.status !== 'Active' && <Badge variant="muted">{member.status}</Badge>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.user}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck aria-hidden="true" />
            {roleLabel(member.membership_role)}
          </Badge>
          <span className="min-w-0 truncate">{scope || t('staff.team.fullScope')}</span>
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={member.status !== 'Active'} data-qa="team-revoke">
            <Trash2 aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('staff.team.revoke')}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.team.revokeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {member.full_name} ({member.user}) {t('staff.team.revokeDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('staff.form.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onRevoke(member)} data-qa="team-revoke-confirm">
              {t('staff.team.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
