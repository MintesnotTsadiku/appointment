import { Briefcase, Building2, Calendar, CalendarRange, MapPin, UserCheck, Users, Wallet } from 'lucide-react';
import { Kpi } from '@/components/analytics/Panels';
import { useTranslation } from '@/lib/i18n';
import { etb, number, type AdminStats } from './types';

export function OverviewKpis({ stats }: { stats: AdminStats }) {
  const { t } = useTranslation();
  const { overview, appointments, revenue } = stats;
  const active = (count: number) => `${number.format(count)} ${t('staff.admin.active')}`;

  return (
    <section aria-labelledby="admin-kpis" className="space-y-3">
      <h2 id="admin-kpis" className="text-base font-semibold">{t('staff.admin.platform')}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi title={t('staff.admin.providers')} value={number.format(overview.total_providers)} detail={active(overview.active_providers)} Icon={Users} />
        <Kpi title={t('staff.admin.organizations')} value={number.format(overview.total_organizations)} detail={active(overview.active_organizations)} Icon={Building2} />
        <Kpi
          title={t('staff.admin.appointmentsMonth')}
          value={number.format(overview.appointments_this_month)}
          detail={growth(appointments.growth, t('staff.admin.vsLastMonth'))}
          tone={appointments.growth >= 0 ? 'up' : 'down'}
          Icon={Calendar}
        />
        <Kpi
          title={t('staff.admin.revenueMonth')}
          value={etb(revenue.this_month)}
          detail={growth(revenue.growth, t('staff.admin.vsLastMonth'))}
          tone={revenue.growth >= 0 ? 'up' : 'down'}
          Icon={Wallet}
        />
        <Kpi title={t('staff.admin.services')} value={number.format(overview.total_services)} Icon={Briefcase} />
        <Kpi title={t('staff.admin.locations')} value={number.format(overview.total_locations)} Icon={MapPin} />
        <Kpi title={t('staff.admin.activeUsers')} value={number.format(overview.active_users)} Icon={UserCheck} />
        <Kpi title={t('staff.admin.thisWeek')} value={number.format(overview.appointments_this_week)} Icon={CalendarRange} />
      </div>
    </section>
  );
}

/** Arrow plus sign keeps direction readable without relying on color. */
function growth(percent: number, suffix: string) {
  const arrow = percent >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(percent)}% ${suffix}`;
}
