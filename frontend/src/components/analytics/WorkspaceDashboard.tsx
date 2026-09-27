import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowUpRight } from 'lucide-react';
import { useSession } from '@/context/session';
import ConfigurableDashboard from './ConfigurableDashboard';

type Report = { metrics: {utilization:{value:number|null}}; today_confirmed:number; next_seven_days:number; current:{completed:number;no_show_rate:{available:boolean;rate:number|null};utilization:{available:boolean;rate:number|null}} };
const surface = { backgroundColor:'var(--bg-elevated)',borderColor:'var(--border-default)' };
function useReport(organization:string|undefined,period:number) {
  const {session}=useSession();
  const scope=JSON.stringify([session?.user,session?.selected?.role,session?.selected?.provider,session?.selected?.locations]);
  return useFrappeGetCall<{message:Report}>('appointment.scheduler.analytics.overview',{organization:organization||'',period},organization?`analytics-${scope}-${organization}-${period}`:null);
}

export function InsightBrief({ kind }: { kind: 'provider' | 'reception' }) {
  const { session } = useSession();
  const organization = session?.selected?.organization;
  const { data, error } = useReport(organization, 7);
  if (!organization || error || !data?.message) return null;
  const report = data.message;
  return <section data-qa={`${kind}-insight-brief`} className="mx-auto mt-5 flex max-w-[1800px] flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border px-5 py-4 text-sm" style={surface}>
    <strong>{kind === 'provider' ? 'Your week' : 'Reception brief'}</strong>
    <span><b className="tabular-nums">{report.today_confirmed}</b> confirmed today</span>
    <span><b className="tabular-nums">{report.next_seven_days}</b> upcoming</span>
    <span><b className="tabular-nums">{report.current.completed}</b> completed this week</span>
    <span><b className="tabular-nums">{report.current.no_show_rate.available ? `${report.current.no_show_rate.rate}%` : '—'}</b> no-show rate</span>
    <span><b className="tabular-nums">{report.metrics.utilization.value!==null ? `${report.metrics.utilization.value}%` : 'unavailable'}</b> current schedule estimate</span>
    <Link to="/analytics" className="ml-auto inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-primary)' }}>View insights <ArrowUpRight className="h-4 w-4" /></Link>
  </section>;
}


export default ConfigurableDashboard;
