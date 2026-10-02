import { useTranslation } from '@/lib/i18n';
import type { WidgetContext } from '../types';
import { Metric, RateMeter, money, number, percent, validComparison } from './parts';

type Props = { ctx: WidgetContext };

export function ConfirmedToday({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.today_confirmed)} detail={`${t('staff.analytics.asOf')} ${ctx.report.today}`} />;
}

export function NextSevenDays({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.next_seven_days)} detail={t('staff.analytics.nextSevenHint')} />;
}

export function AllBookings({ ctx }: Props) {
  const { t } = useTranslation();
  const change = ctx.report.current.total - ctx.report.previous.total;
  return <Metric value={number.format(ctx.report.current.total)} detail={`${change >= 0 ? '+' : ''}${change} ${t('staff.analytics.vsPrior')}`} tone={change > 0 ? 'up' : change < 0 ? 'down' : undefined} />;
}

export function BookedTime({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={`${ctx.report.current.booked_hours} h`} detail={t('staff.analytics.bookedTimeHint')} />;
}

export function Completed({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.current.completed)} detail={t('staff.analytics.completedHint')} />;
}

export function Cancelled({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.current.cancelled)} detail={`${ctx.report.current.no_show} ${t('staff.analytics.noShows')}`} />;
}

export function NoShows({ ctx }: Props) {
  const { t } = useTranslation();
  const change = ctx.report.current.no_show - ctx.report.previous.no_show;
  return <Metric value={number.format(ctx.report.current.no_show)} detail={`${change >= 0 ? '+' : ''}${change} ${t('staff.analytics.vsPrior')}`} tone={change > 0 ? 'down' : change < 0 ? 'up' : undefined} />;
}

export function Customers({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.current.unique_customers)} detail={`${ctx.report.current.repeat_customers} ${t('staff.analytics.repeat')}`} />;
}

export function RepeatShare({ ctx }: Props) {
  const { t } = useTranslation();
  const share = percent(ctx.report.current.repeat_customers, ctx.report.current.unique_customers);
  return <Metric value={share === null ? '—' : `${share}%`} detail={`${ctx.report.current.repeat_customers} / ${ctx.report.current.unique_customers} ${t('staff.analytics.customersLower')}`} />;
}

export function ActiveBookings({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={number.format(ctx.report.current.active)} detail={t('staff.analytics.nextSevenHint')} />;
}

export function DailyAverage({ ctx }: Props) {
  const { t } = useTranslation();
  const average = Math.round((ctx.report.current.total / Math.max(1, ctx.period)) * 10) / 10;
  return <Metric value={number.format(average)} detail={`${t('staff.widgets.dailyAverage.detail')} ${ctx.period}`} />;
}

export function CatalogValue({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={`${money.format(ctx.report.current.catalog_value || 0)} ETB`} detail={t('staff.widgets.catalogValue.detail')} />;
}

export function RecordedPayments({ ctx }: Props) {
  const { t } = useTranslation();
  return <Metric value={`${money.format(ctx.report.current.recorded_payments || 0)} ETB`} detail={t('staff.widgets.recordedPayments.detail')} />;
}

export function NoShowRate({ ctx }: Props) {
  const { t } = useTranslation();
  const { current, previous } = ctx.report;
  const comparison = validComparison(current.no_show_rate.rate, previous.no_show_rate.rate, current.no_show_rate.available && previous.no_show_rate.available, t('staff.analytics.pointsVsPrior'));
  return (
    <RateMeter
      rate={current.no_show_rate.rate}
      value={t(current.no_show_rate.available ? `${current.no_show_rate.rate}%` : "Unavailable")}
      detail={`${current.no_show_rate.numerator} No Show ÷ ${current.no_show_rate.denominator} Completed + No Show · elapsed appointments only`}
      comparison={comparison}
    />
  );
}

export function Utilization({ ctx }: Props) {
  const { t } = useTranslation();
  const { current, previous } = ctx.report;
  const comparison = validComparison(current.utilization.rate, previous.utilization.rate, current.utilization.available && previous.utilization.available, t('staff.analytics.pointsVsPrior'));
  return (
    <RateMeter
      rate={current.utilization.rate}
      value={t(current.utilization.available ? `${current.utilization.rate}%` : "Unavailable")}
      detail={`${current.utilization.booked_hours} booked hours ÷ ${current.utilization.available_hours} available hours · buffers included`}
      comparison={comparison}
    />
  );
}

export function CancellationRate({ ctx }: Props) {
  const { t } = useTranslation();
  const rate = percent(ctx.report.current.cancelled, ctx.report.current.total);
  const before = percent(ctx.report.previous.cancelled, ctx.report.previous.total);
  return (
    <RateMeter
      rate={rate}
      value={rate === null ? '—' : `${rate}%`}
      detail={`${ctx.report.current.cancelled} ${t('staff.widgets.cancellationRate.formula')} ${ctx.report.current.total}`}
      comparison={validComparison(rate, before, rate !== null && before !== null, t('staff.analytics.pointsVsPrior'))}
    />
  );
}

export function Definitions({ ctx }: Props) {
  const { t } = useTranslation();
  const { report } = ctx;
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>{report.definitions.no_show}</p>
      <p>{report.definitions.utilization}</p>
      <p><strong className="text-foreground">Current-schedule estimate:</strong> {report.definitions.schedule_limit}</p>
      {ctx.manager && <p>{report.financial_note} {t('staff.analytics.paymentsNote')}</p>}
    </div>
  );
}
