import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { isAllowedDestination, useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/progress';
import { Bone } from '@/components/states';

interface Offering {
  organization: string;
  published: boolean;
}

interface Step {
  key: string;
  labelKey: string;
  to: string;
  done: boolean;
}

/** Owner/manager checklist derived from existing read endpoints only. */
export function SetupProgress({ organization }: { organization: string }) {
  const { session } = useSession();
  const { t } = useTranslation();
  const offerings = useFrappeGetCall<{ message: Offering[] }>('appointment.scheduler.workspace.overview', undefined, 'home-setup-offerings');
  const canManageTeam = isAllowedDestination('/settings/team', session);
  const members = useFrappeGetCall<{ message: { members: unknown[] } }>(
    'appointment.scheduler.membership.members',
    { organization },
    canManageTeam ? `members-${organization}` : null
  );
  if (offerings.isLoading || (canManageTeam && members.isLoading)) return <SetupSkeleton />;

  const mine = (offerings.data?.message ?? []).filter((row) => row.organization === organization);
  const steps: Step[] = [
    { key: 'business', labelKey: 'staff.home.setup.business', to: '/settings/business', done: true },
    { key: 'services', labelKey: 'staff.home.setup.services', to: '/settings/services', done: mine.length > 0 },
    ...(canManageTeam
      ? [{ key: 'team', labelKey: 'staff.home.setup.team', to: '/settings/team', done: (members.data?.message?.members?.length ?? 0) > 1 }]
      : []),
    { key: 'publish', labelKey: 'staff.home.setup.publish', to: '/settings/business', done: Boolean(session?.selected?.published || mine.some((row) => row.published)) },
  ];
  const complete = steps.filter((step) => step.done).length;
  const percent = Math.round((complete / steps.length) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Progress value={percent} aria-label={`${t('staff.home.setup.title')}: ${percent}%`} />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {complete}/{steps.length}
        </span>
      </div>
      <ul className="-mx-2">
          {steps.map((step) => (
            <li key={step.key}>
              <Link
                to={step.to}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label={t('staff.home.setup.done')} />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={t('staff.home.setup.todo')} />
                )}
                <span className={cn('flex-1', step.done ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'font-medium text-foreground')}>
                  {t(step.labelKey)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="space-y-3">
      <Bone className="h-2 w-full" />
      <Bone className="h-24 w-full" />
    </div>
  );
}
