import {
  Activity, BarChart3, CalendarCheck2, CalendarClock, CalendarDays, CircleCheck, CircleX, Clock3, Coins, Gauge, Grid3x3,
  Info, ListChecks, MapPin, Percent, PieChart, Repeat, Scale, Sparkles, TrendingDown, UserX, Users, Wallet, Zap,
} from 'lucide-react';
import type { DashboardPage, LayoutEntry, WidgetDefinition } from './types';
import * as M from './widgets/metrics';
import * as C from './widgets/charts';
import * as P from './widgets/composition';
import { QuickActionsWidget, SetupWidget, TodayWidget } from './widgets/today';

const kpi = { w: 3, h: 3 };
const kpiMin = { w: 2, h: 3 };
const rate = { w: 6, h: 4 };
const chart = { w: 8, h: 9 };
const chartMin = { w: 4, h: 6 };
const list = { w: 4, h: 9 };

function def(id: string, rest: Omit<WidgetDefinition, 'id' | 'titleKey' | 'descriptionKey'>): WidgetDefinition {
  return { id, titleKey: `staff.widgets.${id}.title`, descriptionKey: `staff.widgets.${id}.description`, ...rest };
}

/** Every widget a staff dashboard can show. Data comes only from existing read endpoints. */
export const WIDGETS: WidgetDefinition[] = [
  def('today', { category: 'today', icon: CalendarCheck2, size: { w: 8, h: 8 }, minSize: { w: 4, h: 5 }, qa: 'home-today', Body: TodayWidget }),
  def('setup', { category: 'setup', icon: ListChecks, size: { w: 4, h: 6 }, minSize: { w: 3, h: 5 }, managerOnly: true, qa: 'home-setup', Body: SetupWidget }),
  def('quickActions', { category: 'setup', icon: Zap, size: { w: 4, h: 8 }, minSize: { w: 3, h: 5 }, Body: QuickActionsWidget }),
  def('confirmedToday', { category: 'today', icon: CircleCheck, size: kpi, minSize: kpiMin, Body: M.ConfirmedToday }),
  def('nextSevenDays', { category: 'today', icon: CalendarDays, size: kpi, minSize: kpiMin, Body: M.NextSevenDays }),
  def('allBookings', { category: 'bookings', icon: BarChart3, size: kpi, minSize: kpiMin, Body: M.AllBookings }),
  def('bookedTime', { category: 'performance', icon: Clock3, size: kpi, minSize: kpiMin, Body: M.BookedTime }),
  def('completed', { category: 'bookings', icon: CircleCheck, size: kpi, minSize: kpiMin, Body: M.Completed }),
  def('cancelled', { category: 'bookings', icon: CircleX, size: kpi, minSize: kpiMin, Body: M.Cancelled }),
  def('noShows', { category: 'bookings', icon: UserX, size: kpi, minSize: kpiMin, Body: M.NoShows }),
  def('customers', { category: 'bookings', icon: Users, size: kpi, minSize: kpiMin, Body: M.Customers }),
  def('repeatShare', { category: 'performance', icon: Repeat, size: kpi, minSize: kpiMin, Body: M.RepeatShare }),
  def('activeBookings', { category: 'today', icon: CalendarClock, size: kpi, minSize: kpiMin, Body: M.ActiveBookings }),
  def('dailyAverage', { category: 'performance', icon: Activity, size: kpi, minSize: kpiMin, Body: M.DailyAverage }),
  def('catalogValue', { category: 'revenue', icon: Wallet, size: kpi, minSize: kpiMin, managerOnly: true, Body: M.CatalogValue }),
  def('recordedPayments', { category: 'revenue', icon: Coins, size: kpi, minSize: kpiMin, managerOnly: true, Body: M.RecordedPayments }),
  def('noShowRate', { category: 'performance', icon: Percent, size: rate, minSize: { w: 3, h: 4 }, qa: 'analytics-no-show', Body: M.NoShowRate }),
  def('utilization', { category: 'performance', icon: Gauge, size: rate, minSize: { w: 3, h: 4 }, qa: 'analytics-utilization', Body: M.Utilization }),
  def('cancellationRate', { category: 'performance', icon: TrendingDown, size: rate, minSize: { w: 3, h: 4 }, Body: M.CancellationRate }),
  def('bookingTrend', { category: 'bookings', icon: BarChart3, size: chart, minSize: chartMin, qa: 'analytics-trend', Body: C.BookingTrend }),
  def('cancellationTrend', { category: 'bookings', icon: TrendingDown, size: { w: 6, h: 8 }, minSize: chartMin, Body: C.CancellationTrend }),
  def('statusMix', { category: 'bookings', icon: PieChart, size: { w: 6, h: 4 }, minSize: { w: 4, h: 4 }, Body: P.StatusMix }),
  def('periodCompare', { category: 'performance', icon: Scale, size: { w: 6, h: 7 }, minSize: { w: 4, h: 6 }, Body: P.PeriodCompare }),
  def('topServices', { category: 'bookings', icon: Sparkles, size: list, minSize: { w: 3, h: 5 }, Body: C.TopServices }),
  def('providerActivity', { category: 'team', icon: Users, size: { w: 6, h: 8 }, minSize: { w: 3, h: 5 }, Body: C.ProviderActivity }),
  def('locationActivity', { category: 'team', icon: MapPin, size: { w: 6, h: 8 }, minSize: { w: 3, h: 5 }, Body: C.LocationActivity }),
  def('weekdayLoad', { category: 'performance', icon: CalendarDays, size: { w: 6, h: 8 }, minSize: chartMin, Body: C.WeekdayLoad }),
  def('hourLoad', { category: 'performance', icon: Clock3, size: { w: 6, h: 8 }, minSize: chartMin, Body: C.HourLoad }),
  def('popularTimes', { category: 'performance', icon: Grid3x3, size: { w: 12, h: 8 }, minSize: { w: 6, h: 7 }, Body: P.PopularTimes }),
  def('definitions', { category: 'performance', icon: Info, size: { w: 12, h: 4 }, minSize: { w: 4, h: 3 }, Body: M.Definitions }),
];

export const WIDGET_BY_ID = new Map(WIDGETS.map((widget) => [widget.id, widget]));

/** Only the widgets a page may show for this role. Overview widgets need the business desk. */
export function availableWidgets(page: DashboardPage, manager: boolean) {
  return WIDGETS.filter((widget) => (manager || !widget.managerOnly) && (page === 'overview' || !OVERVIEW_ONLY.has(widget.id)));
}

const OVERVIEW_ONLY = new Set(['today', 'setup', 'quickActions']);

/** [ids, x, y, w, h]; the first id the role may see is used, so non-managers get a fallback. */
type Slot = [string, number, number, number, number];

const DEFAULTS: Record<DashboardPage, Slot[]> = {
  overview: [
    ['confirmedToday', 0, 0, 3, 3], ['nextSevenDays', 3, 0, 3, 3], ['allBookings', 6, 0, 3, 3], ['bookedTime', 9, 0, 3, 3],
    ['today', 0, 3, 8, 9], ['quickActions', 8, 3, 4, 9],
    ['bookingTrend', 0, 12, 8, 10], ['setup|statusMix', 8, 12, 4, 6], ['statusMix|cancellationRate', 8, 18, 4, 4],
    ['noShowRate', 0, 22, 6, 4], ['utilization', 6, 22, 6, 4],
  ],
  insights: [
    ['confirmedToday', 0, 0, 3, 3], ['nextSevenDays', 3, 0, 3, 3], ['allBookings', 6, 0, 3, 3], ['bookedTime', 9, 0, 3, 3],
    ['completed', 0, 3, 3, 3], ['cancelled', 3, 3, 3, 3], ['customers', 6, 3, 3, 3], ['catalogValue|noShows', 9, 3, 3, 3],
    ['noShowRate', 0, 6, 6, 4], ['utilization', 6, 6, 6, 4],
    ['bookingTrend', 0, 10, 8, 9], ['topServices', 8, 10, 4, 9],
    ['statusMix', 0, 19, 6, 4], ['periodCompare', 6, 19, 6, 8], ['cancellationRate', 0, 23, 6, 4],
    ['providerActivity', 0, 27, 6, 8], ['locationActivity', 6, 27, 6, 8],
    ['popularTimes', 0, 35, 12, 8],
    ['definitions', 0, 43, 12, 4],
  ],
};

export function defaultLayout(page: DashboardPage, manager: boolean): LayoutEntry[] {
  const allowed = new Set(availableWidgets(page, manager).map((widget) => widget.id));
  const used = new Set<string>();
  const items: LayoutEntry[] = [];
  for (const [ids, x, y, w, h] of DEFAULTS[page]) {
    const id = ids.split('|').find((candidate) => allowed.has(candidate) && !used.has(candidate));
    if (!id) continue;
    used.add(id);
    items.push({ i: id, x, y, w, h });
  }
  return items;
}
