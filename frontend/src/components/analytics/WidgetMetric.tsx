import type { Filters } from './dashboardFilterTypes';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { useTranslation } from '@/lib/i18n';
import { MetricWidget, Metric } from './MetricWidget';
import { Chart } from './widgetRegistry';
export function WidgetMetric({id,metric,chart,organization,period,filters,override,scope,compact,quiet}:{compact?:boolean;quiet?:boolean;scope:string;id:string;metric:Metric;chart:Chart;organization:string;period:number;filters:object;override?:Partial<Filters>}) {
 const { t } = useTranslation();
 const effective=JSON.stringify({...filters,...override});
 const query=useFrappeGetCall<{message:Metric}>('appointment.scheduler.analytics.widget',{organization,period,metric_id:id,filters:effective},override?`widget-${scope}-${organization}-${id}-${period}-${effective}`:null);
 if(override&&query.error)return <p role="alert">{t('staff.dashboard.metric.localError')}</p>;
 if(override&&!query.data)return <p role="status">{t('staff.dashboard.metric.localLoading')}</p>;
 return <MetricWidget compact={compact} quiet={quiet} id={id} metric={override?query.data!.message:metric} chart={chart}/>;
}
