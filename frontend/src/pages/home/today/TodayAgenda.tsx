import { Link } from 'react-router-dom';
import { ArrowRight, CalendarX2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import type { Appointment } from '@/pages/reception/types';
import { useDeskDay } from './useDeskDay';

/** Next appointments for today, earliest first, with a jump to the desk. */
export function TodayAgenda({ organization, deskPath }: { organization: string; deskPath: string }) {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useDeskDay(organization);
  const upcoming = sortByStart(data?.message?.appointments ?? []).filter((row) => row.status !== 'Cancelled');
  const nextDate = data?.message?.next_date;

  if (isLoading && !data) return <ListSkeleton count={3} />;
  if (error) return <ErrorState onRetry={() => void mutate()} className="py-6" />;
  if (upcoming.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarX2}
        title={t('staff.home.noneToday')}
        description={nextDate ? `${t('staff.home.nextBooking')} ${formatDay(nextDate)}` : t('staff.home.noneTodayHint')}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={deskPath}>{t('staff.home.openDesk')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{upcoming.length} {t('staff.home.scheduledToday')}</span>
        <Link to={deskPath} className="inline-flex items-center gap-1 rounded-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t('staff.home.openDesk')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ol className="divide-y rounded-lg border">
        {upcoming.map((row) => (
          <AgendaRow key={row.name} appointment={row} />
        ))}
      </ol>
    </div>
  );
}

function AgendaRow({ appointment }: { appointment: Appointment }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <time className="w-14 shrink-0 text-sm font-semibold tabular-nums text-foreground">{appointment.start_time?.slice(0, 5)}</time>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{appointment.client_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[appointment.service_name, appointment.provider_name].filter(Boolean).join(' · ')}
        </p>
      </div>
      <StatusBadge status={appointment.status} />
    </li>
  );
}

function sortByStart(rows: Appointment[]) {
  return [...rows].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
}

function formatDay(value: string) {
  try {
    return format(parseISO(value), 'EEE, d MMM');
  } catch {
    return value;
  }
}
