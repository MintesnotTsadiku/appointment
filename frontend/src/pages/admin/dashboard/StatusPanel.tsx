import { Panel } from '@/components/analytics/Panels';
import { StatusBadge } from '@/components/status-badge';
import { useTranslation } from '@/lib/i18n';
import { number } from './types';

export function StatusPanel({ breakdown }: { breakdown: Record<string, number> }) {
  const { t } = useTranslation();
  const rows = Object.entries(breakdown);
  const largest = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <Panel title={t('staff.admin.statusTitle')} subtitle={t('staff.admin.statusSubtitle')} qa="admin-status-breakdown">
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map(([status, count]) => (
            <li key={status} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
              <StatusBadge status={status} className="w-fit" />
              <strong className="row-span-2 self-end text-sm font-semibold tabular-nums">{number.format(count)}</strong>
              <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-chart-1" style={{ width: `${(count / largest) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote text={t('staff.admin.noStatus')} />
      )}
    </Panel>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
