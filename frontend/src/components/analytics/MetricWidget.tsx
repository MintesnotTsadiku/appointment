import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart } from './widgetRegistry';
export type Metric = {
    value: number | null;
    unit: string;
    definition: string;
    coverage: 'complete' | 'partial' | 'unavailable';
    coverage_note?:string;
    known: number;
    unknown: number;
    time_basis: string;
    rows: {
        name: string;
        count?: number;
        date?: string;
        time?: string;
        status?: string;
        numerator?: number;
        denominator?: number;
        denominator_unit?: string;
    }[];
    numerator?: number;
    denominator?: number;
    comparison?: {
        value: number | null;
        change: number | null;
        coverage: string;
    };
};
const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export function MetricWidget({ metric, chart, id, compact = false, quiet = false }: {
    compact?: boolean;
    quiet?: boolean;
    metric: Metric;
    chart: Chart;
    id: string;
}) {
    const [tooltip, setTooltip] = useState<string | null>(null);
    if (!metric || metric.coverage === 'unavailable' || metric.value === null)
        return <div role="status" className="my-5 text-sm" style={{color:'var(--text-secondary)'}}><p>{metric?.coverage==='partial'?'Partial data · a complete total is unavailable for this scope.':'Unavailable · no eligible denominator or complete capture for this scope.'}</p>{metric&&<details className="mt-3 text-xs"><summary>Metric definition</summary><p className="mt-2">{metric.definition}</p>{metric.coverage_note&&<p>{metric.coverage_note}</p>}</details>}</div>;
    const rows = metric.rows;
    const describe = (row: Metric['rows'][number]) => `${row.name}: ${nf.format(row.count || 0)} ${metric.unit}${row.denominator !== undefined ? ` (${row.numerator} / ${row.denominator} ${row.denominator_unit||'bookings'})` : ''}`;
    const maximum = Math.max(1, ...rows.map(row => row.count || 0));
    const minimum=Math.min(0,...rows.map(row=>row.count||0));
    const extent=maximum-minimum;
    const total = rows.reduce((sum, row) => sum + (row.count || 0), 0);
    const table = <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{metric.definition}</caption><thead><tr><th scope="col">{['agenda','next_appointment'].includes(id) ? 'Time' : 'Category'}</th><th scope="col">{['agenda','next_appointment'].includes(id) ? 'Booking' : 'Value'}</th></tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}><th scope="row" className="py-2 pr-3 font-normal">{row.time || row.name}</th><td>{['agenda','next_appointment'].includes(id) ? <Link className="underline" to="/reception">{row.name} · {row.status}</Link> : <>{nf.format(row.count || 0)}{row.denominator !== undefined && <span className="ml-2 text-xs">({row.numerator} / {row.denominator} {row.denominator_unit||'bookings'})</span>}</>}</td></tr>) : <tr><td colSpan={2} className="py-3">{nf.format(metric.value)} {metric.unit}</td></tr>}</tbody></table></div>;
    const stops = rows.reduce<{
        offset: number;
        parts: string[];
    }>((state, row, index) => {
        const start = state.offset;
        const end = start + (row.count || 0) / Math.max(1, total) * 100;
        state.parts.push(`color-mix(in srgb, var(--accent-primary) ${100 - index * 12}%, var(--bg-elevated)) ${start}% ${end}%`);
        state.offset = end;
        return state;
    }, { offset: 0, parts: [] });
    const points = rows.map((row, index) => `${index / Math.max(1, rows.length - 1) * 100},${100 - (row.count || 0) / maximum * 95}`).join(' ');
    return <div>
    {!compact && chart !== 'value' && chart !== 'radial' && chart !== 'table' && <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{nf.format(metric.value)} {metric.unit}</p>}
    {chart === 'table' ? table : chart === 'value' ? <p className="my-5 font-heading text-3xl font-semibold tabular-nums">{nf.format(metric.value)} <span className="text-sm font-normal">{metric.unit}</span></p> : chart === 'heatmap' ? <div className="my-5 overflow-auto"><div className="grid min-w-[620px] gap-1" style={{ gridTemplateColumns: '40px repeat(24,minmax(0,1fr))' }}><span />{Array.from({ length: 24 }, (_, hour) => <span className="text-center text-[10px]" key={hour}>{hour}</span>)}{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div className="contents" key={day}><span className="text-xs">{day}</span>{Array.from({ length: 24 }, (_, hour) => { const row = rows.find(item => item.name === `${day} ${String(hour).padStart(2, '0')}:00`); return <button key={hour} aria-label={`${day} ${hour}:00 · ${row?.count || 0} ${metric.unit}`} title={`${day} ${hour}:00 · ${row?.count || 0} ${metric.unit}`} className="h-7 rounded focus-visible:ring-2" style={{ background: row?.count ? `color-mix(in srgb, var(--accent-primary) ${Math.max(20, (row.count / maximum) * 100)}%, var(--bg-elevated))` : 'var(--border-subtle)' }} onClick={() => setTooltip(`${day} ${hour}:00 · ${row?.count || 0} ${metric.unit}`)}/>; })}</div>)}</div></div> : chart === 'radial' ? <div className="my-5 flex items-center gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-full p-2" style={{ background: `conic-gradient(var(--accent-primary) ${Math.min(100, Math.max(0, metric.value))}%, var(--border-subtle) 0)` }}><span className="flex h-full w-full items-center justify-center rounded-full" style={{ background: 'var(--bg-elevated)' }}>{nf.format(metric.value)}%</span></div><p className="text-sm">{metric.numerator !== undefined ? `${metric.numerator} / ${metric.denominator}` : 'Current schedule estimate'}</p></div> : chart === 'donut' && total > 0 ? <div className="my-5 flex flex-wrap items-center gap-5"><div role="img" aria-label={`${total} bookings; ${rows.map(row => `${row.name}: ${row.count}`).join(', ')}`} className="h-32 w-32 rounded-full" style={{ background: `conic-gradient(${stops.parts.join(',')})`, maskImage: 'radial-gradient(circle, transparent 45%, black 46%)' }}/><ul className="space-y-1 text-sm">{rows.map(row => <li key={row.name}>{row.name}: {row.count}</li>)}</ul></div> : chart === 'line' || chart === 'area' ? <svg className="my-5 h-36 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${total} bookings. Data table below.`}>{chart === 'area' && <polygon points={`0,100 ${points} 100,100`} fill="var(--accent-primary-light)"/>}<polyline points={points} fill="none" stroke="var(--accent-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>{rows.map((row, index) => <circle key={row.name} tabIndex={0} onFocus={() => setTooltip(describe(row))} onMouseEnter={() => setTooltip(describe(row))} onClick={() => setTooltip(describe(row))} aria-label={describe(row)} cx={index / Math.max(1, rows.length - 1) * 100} cy={100 - (row.count || 0) / maximum * 95} r="1" fill="var(--accent-primary)"><title>{row.name}: {row.count} {metric.unit}</title></circle>)}</svg> : chart === 'bar' && id === 'booking_trend' ? <><div className="my-5 flex h-36 items-end gap-1" aria-label={`${metric.value} bookings by ${metric.time_basis} date`}>{rows.map(row => <button key={row.name} className="min-w-0 flex-1 rounded-t focus-visible:ring-2" style={{ height: `${row.count ? Math.max(3, (row.count / maximum) * 100) : 1}%`, background: row.count ? 'var(--accent-primary)' : 'var(--border-subtle)' }} aria-label={`${row.name}: ${row.count} bookings`} onClick={() => setTooltip(`${row.name}: ${row.count} bookings`)} onFocus={() => setTooltip(`${row.name}: ${row.count} bookings`)} onMouseEnter={() => setTooltip(`${row.name}: ${row.count} bookings`)} title={`${row.name}: ${row.count} bookings`}/>)}</div><p className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}><span>{rows[0]?.name}</span><span>{rows[rows.length - 1]?.name}</span></p></> : <ul className="my-5 max-h-64 space-y-3 overflow-auto">{rows.length ? rows.map(row => <li key={row.name}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{row.name}</span><strong>{row.count}</strong></div><button type="button" onClick={() => setTooltip(describe(row))} onFocus={() => setTooltip(describe(row))} onMouseEnter={() => setTooltip(describe(row))} title={describe(row)} aria-label={describe(row)} className="relative block h-3 w-full rounded-full focus-visible:ring-2" style={{ background: 'var(--border-subtle)' }}><div className="h-full rounded-full" style={{ marginLeft: `${((row.count||0)<0 ? (row.count||0)-minimum : -minimum)/extent*100}%`, width: `${Math.abs(row.count || 0) / extent * 100}%`, background: 'var(--accent-primary)' }}/></button></li>) : <li className="text-sm">No matching bookings.</li>}</ul>}
    {tooltip && <p role="tooltip" className="my-2 rounded border p-2 text-xs" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>{tooltip}</p>}
    {!compact && chart !== 'table' && <details className="mt-3 text-sm"><summary className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>View data</summary>{table}</details>}
    {metric.comparison?.change !== 0 && metric.comparison?.change !== null && metric.comparison?.change !== undefined && !(compact && quiet && chart !== 'value') && <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{metric.comparison.change >= 0 ? '+' : ''}{nf.format(metric.comparison.change)} vs prior period</p>}
    {compact && metric.denominator !== undefined && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{nf.format(metric.numerator || 0)} / {nf.format(metric.denominator)}{metric.rows[0]?.denominator_unit ? ` ${metric.rows[0].denominator_unit}` : ''}</p>}
    {metric.coverage === 'partial' && <p className="mt-2 text-xs" role="status">Partial coverage{!compact && <> · {metric.coverage_note || `${metric.known} known, ${metric.unknown} unknown`}</>}</p>}
    {!compact && <details className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}><summary className="cursor-pointer">Definition · {metric.time_basis} date</summary><p className="mt-2 leading-relaxed">{metric.definition}</p>{metric.denominator !== undefined && <p>{metric.numerator} ÷ {metric.denominator}</p>}</details>}
    {compact && <details className="mt-1 text-xs" style={{color:'var(--text-muted)'}}><summary className="cursor-pointer">Definition and data</summary><p className="my-2">{metric.definition}</p>{metric.coverage_note && <p>{metric.coverage_note}</p>}<p>{metric.known} known · {metric.unknown} unknown</p>{metric.denominator !== undefined && <p>{metric.numerator} ÷ {metric.denominator}</p>}{table}</details>}
  </div>;
}
