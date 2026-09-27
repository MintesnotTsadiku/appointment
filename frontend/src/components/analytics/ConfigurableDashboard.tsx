import { NavigationPreferences } from '@/components/workspace/NavigationPreferences';
import { HomeWorkspace, type ScheduleRow } from './HomeWorkspace';
import type { ReactNode } from 'react';
import { MatchingBookings } from './MatchingBookings';
import { WidgetMetric } from './WidgetMetric';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { ArrowDown, ArrowUp, Download, Plus, Settings2, Trash2 } from 'lucide-react';
import { useSession } from '@/context/session';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox/checkbox';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/dialog';
import { widgetContracts as widgets, industries, presetConfig, DashboardConfig, Placement, Chart, widgetIndustries } from './widgetRegistry';
import { Metric } from './MetricWidget';
import { DashboardFilters } from './DashboardFilters';
import { FieldSelect } from './FieldSelect';
import { initialFilters, Filters } from './dashboardFilterTypes';

const api = 'appointment.scheduler.';
const surface = { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' };
const periods = [{ value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }];
type Report = {
    metrics: Record<string, Metric>;
    today: string;
    workspace_schedule: ScheduleRow[];
    business_name: string;
    start: string;
    end: string;
    timezone: string;
    generated_at: string;
    filter_options: Record<string, string[]>;
};

export default function ConfigurableDashboard({ embedded = false, quickActions }: {
    quickActions?: ReactNode;
    embedded?: boolean;
}) {
    const { session } = useSession();
    const solo = useFrappeGetCall<{ message: { provider: string } }>('appointment.scheduler.independent.workspace', undefined, session?.state === 'individual_owner' ? `independent-dashboard-${session.user}` : null);
    const organization = session?.selected?.organization || (solo.data?.message.provider ? `Provider:${solo.data.message.provider}` : undefined);
    const scope = JSON.stringify([session?.user, session?.state, session?.roles, session?.selected?.role, session?.selected?.is_manager, session?.selected?.provider, session?.selected?.locations]);
    if (!organization) return <p>Choose a business workspace.</p>;
    return <Dashboard key={`${scope}-${organization}-${embedded}`} scope={scope} organization={organization} dashboard={embedded ? 'home' : 'insights'} reception={Boolean(session?.selected?.is_manager || session?.selected?.role === 'Receptionist' || session?.state === 'individual_owner')} financial={Boolean(session?.selected?.is_manager || session?.state === 'individual_owner')} quickActions={quickActions} />;
}

function Dashboard({ organization, dashboard, financial, reception, scope, quickActions }: {
    quickActions?: ReactNode;
    organization: string;
    dashboard: 'home' | 'insights';
    scope: string;
    financial: boolean;
    reception: boolean;
}) {
    const allowed = useMemo(() => widgets.filter(widget => !widget.financial || financial), [financial]);
    const [period, setPeriod] = useState(30);
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const serialized = JSON.stringify(filters);
    const report = useFrappeGetCall<{ message: Report }>(api + 'analytics.overview', { organization, period, filters: serialized }, `dashboard-report-${scope}-${organization}-${period}-${serialized}`);
    const saved = useFrappeGetCall<{ message: DashboardConfig | null }>(api + 'dashboard_config.load', { organization, dashboard }, `dashboard-config-${scope}-${organization}-${dashboard}`);
    const { call: save, loading: saving } = useFrappePostCall<{ message: DashboardConfig }>(api + 'dashboard_config.save');
    const [config, setConfig] = useState<DashboardConfig>(presetConfig('general', dashboard, allowed));
    const [draft, setDraft] = useState<DashboardConfig | null>(null);
    const [appearance, setAppearance] = useState(false);
    const [catalog, setCatalog] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string[]>([]);
    const [catalogIndustries, setCatalogIndustries] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => { if (saved.data) setConfig(saved.data.message || presetConfig('general', dashboard, allowed)); }, [saved.data, allowed, dashboard]);
    const active = draft || config;
    const data = report.data?.message;
    const edit = (placements: Placement[]) => setDraft({ ...active, widgets: placements });
    const move = (index: number, delta: number) => {
        const next = [...active.widgets];
        const other = index + delta;
        if (other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]];
        edit(next);
    };
    const applyPreset = (name: string, replace = false) => {
        const next = presetConfig(name, dashboard, data ? allowed.filter(widget => data.metrics[widget.id]) : allowed);
        setPage(1);
        setDraft(replace ? next : { ...next, widgets: [...active.widgets, ...next.widgets.filter(row => !active.widgets.some(existing => existing.id === row.id))] });
    };
    const persist = async () => {
        try {
            const result = await save({ organization, dashboard, config: JSON.stringify(active) });
            setConfig(result.message);
            setDraft(null);
            await saved.mutate();
            setMessage('Dashboard saved.');
        } catch {
            setMessage('Unable to save. Your changes are still available to retry.');
        }
    };
    const visible = active.widgets.filter(row => allowed.some(widget => widget.id === row.id) && data?.metrics[row.id]);
    const filtered = visible.filter(row => draft || active.preset === 'all' || row.id !== 'attention' || Boolean(data?.metrics[row.id]?.value));
    const shown = filtered.slice((page - 1) * 24, page * 24);
    const compactHome = dashboard === 'home' && !draft && active.preset === 'general' && JSON.stringify(active.widgets) === JSON.stringify(presetConfig('general', 'home', allowed).widgets);
    const renderHomeMetric = (id: string) => {
        const placement = active.widgets.find(row => row.id === id);
        const widget = allowed.find(row => row.id === id);
        if (!data?.metrics[id] || !widget) return null;
        return <WidgetMetric compact quiet={id !== 'booking_trend'} scope={scope} organization={organization} period={period} filters={filters} override={placement?.filters} id={id} metric={data.metrics[id]} chart={placement?.chart || widget.charts[0]} />;
    };
    const onPeriod = (value: string) => { setPeriod(Number(value)); setFilters({ ...filters, start: undefined, end: undefined }); };
    const periodSelect = <FieldSelect data-qa="analytics-period" aria-label="Period" label="Period" value={String(period)} onValueChange={onPeriod} options={periods} />;
    const exportUrl = `/api/method/${api}analytics.export_csv?organization=${encodeURIComponent(organization)}&period=${period}&filters=${encodeURIComponent(serialized)}`;
    return <div className={dashboard === 'home' ? 'space-y-3' : 'space-y-5'} data-qa="workspace-analytics">
        <div className={dashboard === 'home' ? 'home-report-controls' : 'space-y-4'}>
            {dashboard !== 'home' && <header>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Business insights</p>
                <h2 className="mt-1 font-heading text-2xl font-semibold">{data?.business_name || 'Insights'}</h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{data ? `${data.start} to ${data.end} · ${data.timezone}` : 'Loading reporting scope…'}</p>
            </header>}
            <div className="home-toolbar">
                <DashboardFilters filters={filters} onChange={setFilters} options={data?.filter_options || {}} />
                {!compactHome && periodSelect}
                <Button asChild variant="outline" size="sm" className="home-toolbar-btn"><a data-qa="analytics-export" href={exportUrl} download><Download size={16} />Export CSV</a></Button>
                <Button variant="outline" size="sm" className="home-toolbar-btn" onClick={() => setDraft({ ...config, widgets: [...config.widgets] })}><Settings2 size={16} />Customize</Button>
                <Button variant="outline" size="sm" className="home-toolbar-btn" onClick={() => { setDraft({ ...config, widgets: [...config.widgets] }); setCatalog(true); }}>Browse widgets</Button>
                <Button variant="outline" size="sm" className="home-toolbar-btn" onClick={() => setAppearance(true)}>Appearance</Button>
                {dashboard === 'home' && <Link className="text-xs underline" style={{ color: 'var(--text-muted)' }} to="/analytics">Open Insights</Link>}
            </div>
        </div>
        {!compactHome && <div className="home-help flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{dashboard === 'home' ? 'Home is your daily overview.' : 'Insights is your detailed reporting dashboard.'} Each dashboard saves its own widgets and layout.</span>
            <Link className="underline" to={dashboard === 'home' ? '/analytics' : '/home'}>{dashboard === 'home' ? 'Open Insights' : 'Open Home'}</Link>
            {dashboard !== 'home' && <span>{allowed.length} permitted widgets in the library · some require additional data.</span>}
        </div>}
        <Dialog open={appearance} onOpenChange={setAppearance}><DialogContent className="p-6"><DialogTitle>Workspace appearance</DialogTitle><DialogDescription>Appearance choices apply immediately. Navigation preferences are saved to your user account.</DialogDescription><NavigationPreferences /></DialogContent></Dialog>
        {draft && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Editing {dashboard === 'home' ? 'Home' : 'Insights'}: choose an industry to add its widgets, or replace the layout with that preset. Use Add widget to search the full library. Changes take effect when you Save.</p>}
        {draft && <section aria-label="Dashboard customization" className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm" style={surface}>
            <FieldSelect aria-label="Industry preset" label="Industry" value={active.preset} onValueChange={value => applyPreset(value)} options={industries.map(name => ({ value: name, label: name === 'all' ? 'All permitted widgets' : name }))} />
            <Button type="button" variant="link" className="h-auto px-1" onClick={() => applyPreset(active.preset, true)}>Replace with preset</Button>
            <Button type="button" variant="link" className="h-auto px-1" onClick={() => setCatalog(true)}><Plus size={16} />Add widget</Button>
            <Button disabled={saving} className="ml-auto" onClick={() => void persist()}>Save</Button>
            <Button type="button" variant="link" className="h-auto px-1" onClick={() => { setDraft(null); setPage(1); }}>Cancel</Button>
        </section>}
        <p role="status" className="text-sm">{message}</p>
        {report.error ? <div role="alert" className="rounded-xl border p-5" style={surface}>Unable to load this reporting scope. <Button type="button" variant="link" className="h-auto px-1" onClick={() => void report.mutate()}>Retry</Button></div> : !data ? <p role="status">Loading widgets…</p> : compactHome ? <HomeWorkspace range={`${data.start} to ${data.end}`} today={data.today} timezone={data.timezone} schedule={data.workspace_schedule || []} metrics={data.metrics} render={renderHomeMetric} quickActions={quickActions} periodControl={periodSelect} /> : <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((placement) => {
                const widget = allowed.find(item => item.id === placement.id)!;
                const index = active.widgets.indexOf(placement);
                return <section key={placement.id} aria-label={widget.title} data-widget={placement.id} className={`min-w-0 rounded-2xl border p-5 ${placement.span === 3 ? 'md:col-span-2 xl:col-span-3' : placement.span === 2 ? 'md:col-span-2' : ''}`} style={surface}>
                    <div className="flex items-start justify-between gap-2"><div><p className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>{widget.category}</p><h3 className="font-heading text-base font-semibold">{widget.title}</h3></div>{placement.id === 'agenda' && <Link to="/reception" className="text-sm underline" style={{ color: 'var(--text-secondary)' }}>Open reception</Link>}</div>
                    {draft && <div className="mt-3 flex flex-wrap items-center gap-2 border-b pb-3 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${widget.title} earlier`}><ArrowUp size={18} /></Button>
                        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={index === active.widgets.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${widget.title} later`}><ArrowDown size={18} /></Button>
                        <FieldSelect aria-label={`Size of ${widget.title}`} label="Size" value={String(placement.span)} onValueChange={value => edit(active.widgets.map((row, i) => i === index ? { ...row, span: Number(value) as 1 | 2 | 3 } : row))} options={[1, 2, 3].map(span => ({ value: String(span), label: String(span) }))} triggerClassName="min-w-[4.5rem]" />
                        <FieldSelect aria-label={`Chart for ${widget.title}`} label="Chart" value={placement.chart} onValueChange={value => edit(active.widgets.map((row, i) => i === index ? { ...row, chart: value as Chart } : row))} options={widget.charts.map(chart => ({ value: chart, label: chart }))} />
                        <FieldSelect aria-label={`Local date basis for ${widget.title}`} label="Local date basis" value={placement.filters?.basis || '__inherit__'} onValueChange={value => edit(active.widgets.map((row, i) => i === index ? { ...row, filters: value === '__inherit__' ? undefined : { basis: value } } : row))} options={[{ value: '__inherit__', label: 'Inherit' }, ...['appointment', 'creation', 'outcome', 'event'].map(basis => ({ value: basis, label: basis }))]} />
                        <Button type="button" variant="ghost" size="icon" className="ml-auto min-h-11 min-w-11" aria-label={`Remove ${widget.title}`} onClick={() => edit(active.widgets.filter((_, i) => i !== index))}><Trash2 size={16} /></Button>
                    </div>}
                    {draft && <DashboardFilters label={`Local filters for ${widget.title}`} filters={{ ...filters, ...placement.filters }} options={data.filter_options} onChange={next => edit(active.widgets.map((row, i) => i === index ? { ...row, filters: next } : row))} />}
                    {widget.drillDown && (financial || !widget.drillDown.startsWith('/settings')) && (reception || widget.drillDown !== '/reception') && <Link to={widget.drillDown} className="mt-3 inline-block text-xs underline" style={{ color: 'var(--text-secondary)' }}>Open related records</Link>}
                    {['total', 'active', 'pending', 'completed', 'cancelled', 'no_show', 'services', 'providers', 'locations', 'booked_hours', 'agenda', 'attention', 'upcoming', 'no_show_rate', 'attendance_rate', 'outcomes', 'sources', 'booking_trend'].includes(widget.id) && <MatchingBookings scope={scope} organization={organization} id={widget.id} period={period} filters={{ ...filters, ...placement.filters }} />}
                    <WidgetMetric scope={scope} organization={organization} period={period} filters={filters} override={placement.filters} id={widget.id} metric={data.metrics[widget.id]} chart={widget.charts.includes(placement.chart) ? placement.chart : widget.charts[0]} />
                </section>;
            })}
        </div>}
        {!compactHome && quickActions && <div className="mt-5">{quickActions}</div>}
        {filtered.length > 24 && <nav aria-label="Widget pages" className="flex justify-center gap-4 text-sm">
            <Button type="button" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page} of {Math.ceil(filtered.length / 24)}</span>
            <Button type="button" variant="ghost" disabled={page * 24 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button>
        </nav>}
        {data && <p data-qa="analytics-freshness" className="text-xs" style={{ color: 'var(--text-muted)' }}>Generated {new Date(data.generated_at).toLocaleString()} · operational cards use today’s local window. Historical capacity uses current schedules.</p>}
        <Dialog open={catalog} onOpenChange={setCatalog}><DialogContent className="max-h-[85vh] overflow-auto p-6">
            <DialogTitle>Add a widget</DialogTitle>
            <DialogDescription>Search the widget library for your current business and role. Added widgets are marked below. Save your layout after adding widgets.</DialogDescription>
            <div className="space-y-1"><Label htmlFor="widget-search">Search</Label><Input id="widget-search" autoFocus value={search} onChange={event => setSearch(event.target.value)} /></div>
            <fieldset className="grid grid-cols-2 gap-2 text-sm"><legend className="mb-2">Categories · choose any</legend>{[...new Set(allowed.map(widget => widget.category))].map(name => <label key={name} className="flex items-center gap-2 rounded-lg border p-2" style={surface}><Checkbox checked={category.includes(name)} onCheckedChange={checked => setCategory(checked ? [...category, name] : category.filter(value => value !== name))} />{name}</label>)}</fieldset>
            <fieldset className="flex flex-wrap gap-3"><legend className="text-sm">Industries</legend>{industries.filter(industry => industry !== 'all').map(industry => <label key={industry} className="flex items-center gap-2 text-xs"><Checkbox checked={catalogIndustries.includes(industry)} onCheckedChange={checked => setCatalogIndustries(checked ? [...catalogIndustries, industry] : catalogIndustries.filter(value => value !== industry))} />{industry}</label>)}</fieldset>
            <ul className="space-y-2">{allowed.filter(widget => Boolean(data?.metrics[widget.id]) && widget.title.toLowerCase().includes(search.toLowerCase()) && (!category.length || category.includes(widget.category)) && (!catalogIndustries.length || widgetIndustries(widget.id).some(industry => catalogIndustries.includes(industry)))).map(widget => <li key={widget.id}><Button type="button" variant="outline" disabled={active.widgets.some(row => row.id === widget.id)} className="h-auto w-full justify-between p-3 text-left" onClick={() => { edit([...active.widgets, { id: widget.id, chart: widget.charts[0], span: widget.span }]); setCatalog(false); }}>{widget.title}<span>{active.widgets.some(row => row.id === widget.id) ? 'Added' : '+'}</span></Button></li>)}</ul>
        </DialogContent></Dialog>
    </div>;
}
