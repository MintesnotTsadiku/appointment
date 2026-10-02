import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Loader2, MapPin } from 'lucide-react';
import { useSession, type Workspace } from '@/context/session';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { BusinessMark, StaffShell, useRoleLabel } from '@/components/staff-shell';
import { Bone } from '@/components/states';
import { useTranslation } from '@/lib/i18n';

export default function Workspaces() {
  const { session, loading, selectWorkspace } = useSession();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    if (!session.authenticated) {
      window.location.href = '/login?redirect-to=%2Fworkspaces';
      return;
    }
    if (session.state !== 'selection' && session.state !== 'workspace') {
      navigate(session.landing, { replace: true });
    } else if (session.state === 'workspace' && session.workspaces.length === 1) {
      navigate(session.landing, { replace: true });
    }
  }, [loading, session, navigate]);

  const open = async (organization: string, landing: string) => {
    setOpening(organization);
    try {
      const next = await selectWorkspace(organization);
      navigate(next?.selected?.landing ?? landing);
    } finally {
      setOpening(null);
    }
  };

  const count = session?.workspaces.length ?? 0;
  return (
    <StaffShell
      width="default"
      title={t('staff.workspaces.title')}
      description={loading || !session ? t('staff.workspaces.loading') : t('staff.workspaces.count').replace('{count}', String(count))}
      headingQa="workspaces-heading"
    >
      {loading || !session ? (
        <CardsSkeleton />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-qa="workspace-list">
          {session.workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.organization}
              workspace={workspace}
              busy={opening === workspace.organization}
              disabled={opening !== null}
              onOpen={() => void open(workspace.organization, workspace.landing)}
            />
          ))}
        </ul>
      )}
    </StaffShell>
  );
}

interface CardProps {
  workspace: Workspace;
  busy: boolean;
  disabled: boolean;
  onOpen: () => void;
}

/** QA clicks the card's only <button>; keep any extra controls as links or spans. */
function WorkspaceCard({ workspace, busy, disabled, onOpen }: CardProps) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const locations = workspace.location_names.length ? workspace.location_names.join(', ') : t('staff.workspaces.allLocations');

  return (
    <li data-qa="workspace-card" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-card">
      <div className="flex min-w-0 items-start gap-3">
        <BusinessMark name={workspace.business_name} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold" title={workspace.business_name}>{workspace.business_name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{roleLabel(workspace.role)}</Badge>
            {!workspace.published && <Badge variant="muted">{t('staff.workspaces.draft')}</Badge>}
          </div>
        </div>
      </div>
      <dl className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex min-w-0 items-start gap-2">
          <dt className="shrink-0 pt-0.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t('staff.workspaces.locations')}</span>
          </dt>
          <dd className="min-w-0 break-words">{locations}</dd>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <dt className="shrink-0 pt-0.5">
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t('staff.workspaces.timezone')}</span>
          </dt>
          <dd className="min-w-0 truncate">{workspace.timezone ?? 'Africa/Addis Ababa'}</dd>
        </div>
      </dl>
      <Button className="mt-auto w-full sm:w-fit" onClick={onOpen} disabled={disabled} aria-label={`${t('staff.workspaces.open')} ${workspace.business_name}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {t('staff.workspaces.open')}
        {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </li>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 2 }, (_, i) => (
        <Bone key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
