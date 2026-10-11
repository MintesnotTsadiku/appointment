import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/states';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';
import type { SourceCount } from './types';

/** New businesses per sign-up channel over the last 30 or 90 days. */
export function SourcesPanel({ sources }: { sources: Record<'30' | '90', SourceCount[]> }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<'30' | '90'>('30');
  const rows = sources[days] || [];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const top = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{fill(t('staff.referralsAdmin.sourcesTotal'), total)}</p>
        <ToggleGroup type="single" value={days} onValueChange={(value) => value && setDays(value as '30' | '90')} data-qa="admin-sources-window">
          <ToggleGroupItem value="30" className="min-h-9 px-3" data-qa="admin-sources-30">{fill(t('staff.referralsAdmin.lastDays'), 30)}</ToggleGroupItem>
          <ToggleGroupItem value="90" className="min-h-9 px-3" data-qa="admin-sources-90">{fill(t('staff.referralsAdmin.lastDays'), 90)}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {rows.length ? (
        <ul data-qa="admin-sources-list" className="space-y-3">
          {rows.map((row) => (
            <li key={row.source} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
              <span className="truncate text-sm text-foreground" title={row.source}>{sourceLabel(t, row.source)}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((row.count / top) * 100)}%` }} />
              </span>
              <span className="w-8 text-right text-sm font-medium tabular-nums text-foreground">{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={BarChart3} title={t('staff.referralsAdmin.emptySources')} />
      )}
    </div>
  );
}

const KNOWN = new Set([
  'direct', 'referral', 'partner', 'powered_by_page', 'powered_by_email', 'powered_by_sms', 'customer_prompt',
  'directory', 'year_review', 'template_credit', 'telegram_share',
]);

/** Known channels have a label; tool pages read "Tool: <slug>"; anything else shows as stored. */
function sourceLabel(t: (key: string) => string, source: string) {
  if (KNOWN.has(source)) return t(`staff.referralsAdmin.source.${source}`);
  if (source.startsWith('tool_')) return fill(t('staff.referralsAdmin.source.tool'), source.slice(5).replace(/[-_]/g, ' '));
  return source;
}
