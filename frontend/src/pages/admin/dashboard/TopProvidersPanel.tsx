import { Panel } from '@/components/analytics/Panels';
import { useTranslation } from '@/lib/i18n';
import { EmptyNote } from './StatusPanel';
import { etb, number, type TopProvider } from './types';

export function TopProvidersPanel({ providers }: { providers: TopProvider[] }) {
  const { t } = useTranslation();
  return (
    <Panel title={t('staff.admin.topProviders')} subtitle={t('staff.admin.topProvidersSubtitle')} qa="admin-top-providers">
      {providers.length ? (
        <ol className="divide-y">
          {providers.map((provider, index) => (
            <li key={provider.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{provider.provider_name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {number.format(provider.appointment_count)} {t('staff.admin.appointmentsUnit')}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{etb(provider.total_revenue)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyNote text={t('staff.admin.noProviders')} />
      )}
    </Panel>
  );
}
