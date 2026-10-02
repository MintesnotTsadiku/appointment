import { CalendarDays, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Bone } from '@/components/states';
import type { CalendarStats as Stats } from './types';

/** Three headline counts from get_calendar_stats. */
export function CalendarStats({ stats, loading }: { stats: Stats; loading: boolean }) {
  const { t } = useTranslation();
  const items: Array<{ key: string; icon: LucideIcon; value: number; label: string; hint: string }> = [
    { key: 'week', icon: CalendarDays, value: stats.this_week, label: t('staff.calendar.stats.thisWeek'), hint: t('staff.calendar.stats.thisWeekHint') },
    { key: 'upcoming', icon: Clock, value: stats.upcoming, label: t('staff.calendar.stats.upcoming'), hint: t('staff.calendar.stats.upcomingHint') },
    { key: 'completed', icon: CheckCircle2, value: stats.completed_this_month, label: t('staff.calendar.stats.completed'), hint: t('staff.calendar.stats.completedHint') },
  ];
  return (
    <section aria-label={t('staff.calendar.stats.heading')} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ key, icon: Icon, value, label, hint }) => (
        <div key={key} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {loading ? <Bone className="mt-1 h-7 w-12" /> : <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>}
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
