import type { Filters } from './dashboardFilterTypes';
export type Chart = 'value' | 'bar' | 'line' | 'area' | 'donut' | 'radial' | 'table' | 'heatmap';
export type Widget = {
    id: string;
    title: string;
    category: string;
    charts: Chart[];
    financial?: boolean;
    span: 1 | 2 | 3;
    filters?: Partial<Filters>;
};
export type Placement = {
    id: string;
    chart: Chart;
    span: 1 | 2 | 3;
    filters?: Partial<Filters>;
};
export type DashboardConfig = {
    version: 1;
    preset: string;
    widgets: Placement[];
};
const values: [
    string,
    string,
    string
][] = [
    ['total', 'All bookings', 'Bookings'], ['completed', 'Completed', 'Bookings'], ['cancelled', 'Cancelled', 'Bookings'], ['no_show', 'No-shows', 'Bookings'], ['pending', 'Pending confirmation', 'Attention'],
    ['upcoming', 'Upcoming seven days', 'Operations'], ['attention', 'Unresolved appointments', 'Attention'], ['booked_hours', 'Scheduled hours', 'Capacity'], ['occupied_hours', 'Occupied capacity hours', 'Capacity'],
    ['unique_customers', 'Unique customers', 'Customers'], ['repeat_customers', 'Repeat within period', 'Customers'], ['new_customers', 'New customers', 'Customers'], ['returning_customers', 'Returning customers', 'Customers'], ['bookings_per_customer', 'Bookings per customer', 'Customers'], ['missing_contacts', 'Missing contacts', 'Quality'],
    ['average_duration', 'Average scheduled duration', 'Timing'], ['reschedules', 'Reschedule events', 'Timing'], ['confirmations', 'Confirmation events', 'Timing'], ['cancellations_events', 'Cancellation events', 'Timing'], ['confirmation_turnaround', 'Confirmation turnaround', 'Timing'], ['actual_duration', 'Actual service duration', 'Timing'], ['service_delay', 'Service delay', 'Reception'], ['cancellation_notice', 'Cancellation notice', 'Timing'], ['arrivals', 'Arrivals', 'Reception'], ['checked_in', 'Checked in', 'Reception'],
];
const rates: [
    string,
    string,
    string
][] = [['no_show_rate', 'No-show rate', 'Outcomes'], ['attendance_rate', 'Attendance rate', 'Outcomes'], ['completion_rate', 'Completion rate', 'Outcomes'], ['cancellation_rate', 'Cancellation rate', 'Outcomes'], ['repeat_percentage', 'Repeat customer percentage', 'Customers'], ['reschedule_rate', 'Reschedule rate', 'Timing'], ['utilization', 'Provider utilization', 'Capacity']];
const categories: [
    string,
    string,
    string
][] = [['outcomes', 'Booking outcomes', 'Outcomes'], ['sources', 'Booking sources', 'Bookings'], ['services', 'Service demand', 'Services'], ['providers', 'Provider workload', 'Team'], ['locations', 'Location workload', 'Team'], ['duration_distribution', 'Scheduled duration distribution', 'Timing'], ['cancellation_reasons', 'Cancellation reasons', 'Outcomes']];
export const widgets: Widget[] = [
    { id: 'agenda', title: "Today's agenda", category: 'Operations', charts: ['table'], span: 2 },
    ...values.map(([id, title, category]): Widget => ({ id, title, category, charts: ['value', 'table'], span: 1 })),
    ...rates.map(([id, title, category]): Widget => ({ id, title, category, charts: ['value', 'radial', 'table'], span: 1 })),
    { id: 'booking_trend', title: 'Booking activity', category: 'Bookings', charts: ['bar', 'line', 'area', 'table'], span: 2 },
    ...categories.map(([id, title, category]): Widget => ({ id, title, category, charts: ['bar', 'table', ...(['outcomes', 'sources'].includes(id) ? ['donut' as Chart] : [])], span: 1 })),
    ...[['agreed_value', 'Original agreed value'], ['catalog_value', 'Current catalog estimate'], ['recorded_payments', 'Recorded payments'], ['discounts', 'Agreed discounts'], ['payment_records', 'Bookings with recorded amounts']].map(([id, title]): Widget => ({ id, title, category: 'Booking value', charts: ['value', 'table'], financial: true, span: 1 })),
];
const additional: [
    string,
    string,
    string
][] = [
    ['buffer_hours','Recorded buffer hours','Capacity'],['occupied_heatmap','Occupied-hour heatmap','Capacity'],['future_slots','Available offering slots','Capacity'],['next_slot','Next available slot','Capacity'],
    ['referrals', 'Referral booking totals', 'Bookings'], ['late_cancellation_rate', 'Late cancellation rate', 'Timing'], ['changes_per_booking', 'Changes per booking', 'Timing'], ['verified_recovery', 'Verified slot recovery', 'Capacity'],
    ['lead_time', 'Booking lead time', 'Timing'], ['lead_time_distribution', 'Lead time distribution', 'Timing'], ['creation_demand', 'Booking creation demand', 'Bookings'], ['start_popularity', 'Appointment start popularity', 'Bookings'], ['recent_activity', 'Recent booking actions', 'Operations'], ['capture_quality', 'Capture completeness', 'Quality'], ['reception_state', 'Reception open locations', 'Reception'],
    ['visit_interval', 'Visit intervals', 'Customers'], ['days_since_visit', 'Days since completed visit', 'Customers'], ['lapse_risk', 'Rule-based lapse risk', 'Customers'], ['second_visit_conversion', 'First-to-second visit conversion', 'Customers'], ['retention_30', '30-day retention', 'Customers'], ['retention_60', '60-day retention', 'Customers'], ['retention_90', '90-day retention', 'Customers'], ['cohorts', 'Mature customer cohorts', 'Customers'], ['booking_concentration', 'Booking concentration', 'Customers'], ['customer_cancellation', 'Customer cancellation frequency', 'Customers'], ['customer_no_show', 'Customer no-show frequency', 'Customers'], ['likely_duplicates', 'Likely duplicate contacts', 'Quality'], ['unmatched_customers', 'Unmatched customer records', 'Quality'], ['completed_today', 'Completed today', 'Operations'], ['today_workload', "Today's provider workload", 'Operations'], ['conflicts', 'Occupied interval conflicts', 'Attention'], ['active_providers', 'Active providers', 'Team'], ['active_locations', 'Active locations', 'Team'], ['walk_ins_waiting', 'Walk-ins waiting', 'Reception'], ['walk_ins_assigned', 'Walk-ins assigned', 'Reception'], ['walk_ins_cancelled', 'Walk-ins cancelled', 'Reception'], ['current_queue_wait', 'Current queue wait', 'Reception'], ['queue_wait', 'Historical queue wait', 'Reception'], ['walk_in_conversion', 'Walk-in assignment conversion', 'Reception'],
];
widgets.push(...additional.map(([id, title, category]): Widget => ({ id, title, category, charts: ['creation_demand', 'start_popularity', 'occupied_heatmap'].includes(id) ? ['heatmap', 'bar', 'table'] : ['value', 'table'], span: ['creation_demand', 'start_popularity', 'occupied_heatmap'].includes(id) ? 2 : 1 })));
widgets.push(...[['invitation_turnaround','Invitation acceptance turnaround'],['content_type_status','Published content types'],['publication_activity','Publication activity'],['withdrawal_activity','Content withdrawals'],
    ['newsletter_confirmation_rate','Newsletter confirmation rate'],['newsletter_confirmation_time','Newsletter confirmation time'],['newsletter_unsubscribed','Unsubscribed audience'],['scheduled_campaigns','Scheduled newsletter campaigns'],['catalog_quality', 'Service catalog quality'], ['invitations', 'Team invitations'], ['content_status', 'Content status'], ['gallery_status', 'Gallery status'], ['newsletter_audience', 'Newsletter audience'], ['newsletter_campaigns', 'Newsletter campaigns'], ['local_captured', 'Locally captured messages'], ['newsletter_skipped', 'Newsletter skipped messages'], ['newsletter_retries', 'Newsletter retries'], ['sender_readiness', 'Newsletter sender readiness'], ['website_status', 'Website publication status'], ['payment_concentration', 'Recorded-payment concentration'], ['payments_per_customer', 'Recorded payments per customer']].map(([id, title]): Widget => ({ id, title, category: 'Business setup', charts: ['value', 'bar', 'table'], financial: true, span: 1 })));
export const industries = ['general', 'clinic', 'freelancer', 'consultant', 'hairstylist', 'organization', 'reception', 'all'];
const home: Record<string, string[]> = {
    general: ['agenda', 'attention', 'total', 'unique_customers', 'booked_hours', 'booking_trend', 'services', 'no_show_rate', 'utilization', 'agreed_value'],
    clinic: ['agenda', 'attention', 'arrivals', 'service_delay', 'no_show_rate', 'utilization'],
    freelancer: ['agenda', 'upcoming', 'booked_hours', 'confirmation_turnaround', 'agreed_value'],
    consultant: ['agenda', 'attention', 'upcoming', 'repeat_customers', 'booked_hours', 'agreed_value'],
    hairstylist: ['agenda', 'arrivals', 'providers', 'services', 'actual_duration', 'agreed_value'],
    organization: ['agenda', 'attention', 'locations', 'providers', 'utilization', 'services'],
    reception: ['agenda', 'walk_ins_waiting', 'arrivals', 'checked_in', 'current_queue_wait', 'service_delay', 'attention'],
};
const insights: Record<string, string[]> = {
    general: ['total', 'completed', 'cancelled', 'unique_customers', 'booking_trend', 'outcomes', 'utilization', 'services', 'agreed_value'],
    clinic: ['attendance_rate', 'no_show_rate', 'utilization', 'repeat_customers', 'booking_trend', 'services'],
    freelancer: ['booked_hours', 'confirmation_turnaround', 'new_customers', 'returning_customers', 'agreed_value', 'booking_trend'],
    consultant: ['repeat_percentage', 'confirmation_turnaround', 'services', 'booked_hours', 'agreed_value', 'booking_trend'],
    hairstylist: ['services', 'repeat_percentage', 'average_duration', 'no_show_rate', 'discounts', 'agreed_value', 'booking_trend'],
    organization: ['providers', 'locations', 'utilization', 'services', 'outcomes', 'booking_trend'],
    reception: ['arrivals', 'checked_in', 'service_delay', 'attention', 'booking_trend'],
};
export function presetConfig(preset: string, dashboard: 'home' | 'insights', allowed: Widget[]): DashboardConfig {
    const ids = preset === 'all' ? [...allowed].sort((a,b)=>a.category.localeCompare(b.category)).map(widget => widget.id) : (dashboard === 'home' ? home : insights)[preset] || home.general;
    return { version: 1, preset, widgets: ids.flatMap(id => { const widget = allowed.find(item => item.id === id); return widget ? [{ id, chart: widget.charts[0], span: dashboard === 'home' && ['agenda', 'attention'].includes(id) ? 3 : widget.span }] : []; }) };
}

export function widgetIndustries(id:string) {
    const category=widgets.find(widget=>widget.id===id)?.category;
    const relevant=category==='Customers'?['clinic','consultant','hairstylist']:category==='Reception'?['clinic','reception','hairstylist']:['clinic','freelancer','consultant','hairstylist','organization'];
    return industries.filter(industry=>relevant.includes(industry)||industry==='general'||industry==='all' || (home[industry]||[]).includes(id) || (insights[industry]||[]).includes(id));
}


for (const dimension of ['service','provider','location']) {
    widgets.push({id:`${dimension}_scheduled_hours`,title:`${dimension} scheduled hours`,category:'Workload',charts:['bar','table'],span:1});
    for (const outcome of ['completed','cancelled','no_show']) widgets.push({id:`${dimension}_${outcome}_rate`,title:`${dimension} ${outcome.replace('_',' ')} rate`,category:'Outcomes',charts:['bar','table'],span:1});
    widgets.push({id:`${dimension}_catalog_value`,title:`${dimension} current-price estimate`,category:'Booking value',charts:['bar','table'],span:1,financial:true});
}
widgets.push({id:'customer_preferences',title:'Customer service preferences',category:'Customers',charts:['bar','table'],span:1});
widgets.push(...[['average_estimate','Average current-price estimate'],['estimated_cancellation_loss','Cancelled catalog estimate'],['estimated_no_show_loss','No-show catalog estimate'],['discount_usage','Discount usage']].map(([id,title]):Widget=>({id,title,category:'Booking value',charts:['value','table'],span:1,financial:true})));

widgets.push(...[['available_hours','Current working hours'],['unused_hours','Unused current working hours'],['schedule_gaps','Current schedule gaps'],['fragmentation','Gaps under 30 minutes'],['buffer_share','Recorded buffer share'],['capacity_adjusted_popularity','Demand inside current capacity'],['no_availability_days','Days without current availability'],['provider_utilization','Utilization by provider'],['location_utilization','Utilization by location'],['service_utilization','Utilization by service'],['recovery_rate','Verified recovery rate']].map(([id,title]):Widget=>({id,title,category:'Capacity',charts:id.endsWith('_utilization')?['bar','table']:['value','table'],span:1})));
widgets.push(...[['change_initiators','Change initiators'],['arrival_punctuality','Arrival punctuality'],['service_overrun','Service overrun'],['reception_queue_wait','Check-in to service wait'],['appointment_weekday_mix','Appointment weekdays']].map(([id,title]):Widget=>({id,title,category:'Timing',charts:['value','bar','table'],span:1})));

widgets.push({id:'next_appointment',title:'Next appointment',category:'Operations',charts:['table'],span:1});
widgets.push(...[['missing_staff_availability','Missing custom staff hours'],['customer_provider_preferences','Customer provider preferences'],['customer_location_preferences','Customer location preferences']].map(([id,title]):Widget=>({id,title,category:'Quality',charts:['value','bar','table'],span:1})));
widgets.push(...[['setup_completeness','Business setup checks'],['pending_imports','Pending imports'],['campaign_errors','Campaign errors'],['newsletter_growth','Audience creation trend'],['newsletter_unsubscribe_trend','Audience unsubscribe trend']].map(([id,title]):Widget=>({id,title,category:'Business setup',charts:['value','bar','table'],span:1,financial:true})));

for (const dimension of ['service','provider','location']) widgets.push(...[['average_duration','average scheduled duration'],['actual_duration','actual duration'],['service_delay','service delay']].map(([key,title]):Widget=>({id:`${dimension}_${key}`,title:`${dimension} ${title}`,category:'Timing',charts:['bar','table'],span:1})));
widgets.push({id:'opening_hours',title:'Current location opening windows',category:'Team',charts:['value','bar','table'],span:1});
widgets.push(...[['gallery_completeness','Gallery checklist issues'],['publishing_errors','Publishing error coverage'],['import_errors','Import error coverage'],['attention_resolution','Issue resolution time'],['future_estimate','Future current-price estimate'],['missing_payment_entries','Zero or missing recorded amounts'],['paid_customers','Customers with recorded amounts']].map(([id,title]):Widget=>({id,title,category:'Business setup',charts:['value','table'],span:1,financial:true})));

widgets.push(...[['active','Eligible active bookings'],['confirmed_today','Confirmed today'],['event_coverage','Workflow event coverage']].map(([id,title]):Widget=>({id,title,category:'Bookings',charts:['value','table'],span:1})));

const resolutionWidget=widgets.find(widget=>widget.id==='attention_resolution');
if(resolutionWidget){resolutionWidget.financial=false;resolutionWidget.category='Timing';resolutionWidget.title='Overdue booking resolution time';}

widgets.push(...[['service_share','Service booking share'],['service_trend','Service appointment trend'],['service_repeat_usage','Repeat service usage']].map(([id,title]):Widget=>({id,title,category:'Services',charts:['bar','table'],span:1})));
widgets.push(...[['peak_starts','Starts in observed peak hours'],['offpeak_starts','Starts outside observed peak hours']].map(([id,title]):Widget=>({id,title,category:'Bookings',charts:['value','table'],span:1})));

export const widgetContracts = widgets.map(widget => ({
    ...widget,
    metricIds: [widget.id],
    supportedFilters: ['business','dateRange','basis','providers','locations','services','statuses','sources','segment','granularity'],
    industryTags: widgetIndustries(widget.id),
    permission: widget.financial ? 'manager' : 'business scope',
    dependencies: ['agreed_value','discounts','reschedules','confirmations','cancellations_events','arrivals','checked_in','actual_duration','service_delay','verified_recovery'].includes(widget.id) ? ['committed workflow capture'] : ['installed business records'],
    minimumSize: {columns:1, width:240},
    states: {loading:'Loading metric',empty:'No matching records',unavailable:'No eligible denominator or complete capture',partial:'Known and unknown coverage shown',error:'Retry this metric'},
    drillDown: ['agenda','attention','pending','arrivals','checked_in'].includes(widget.id)?'/reception':['services','catalog_quality'].includes(widget.id)?'/settings/business':null,
}));
