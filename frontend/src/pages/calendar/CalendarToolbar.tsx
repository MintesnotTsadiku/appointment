import { CalendarDays, ChevronLeft, ChevronRight, Clock, Grid3x3, List, Search, type LucideIcon } from 'lucide-react';
import { isToday } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { rangeLabel } from './dates';
import { STATUS_OPTIONS, type ViewMode } from './types';

const VIEWS: Array<{ mode: ViewMode; icon: LucideIcon; labelKey: string }> = [
  { mode: 'month', icon: Grid3x3, labelKey: 'staff.calendar.viewMonth' },
  { mode: 'week', icon: CalendarDays, labelKey: 'staff.reception.week' },
  { mode: 'day', icon: Clock, labelKey: 'staff.reception.day' },
  { mode: 'list', icon: List, labelKey: 'staff.calendar.list' },
];

const STEP_LABELS: Record<ViewMode, [string, string]> = {
  month: ['staff.calendar.prevMonth', 'staff.calendar.nextMonth'],
  week: ['staff.reception.prevWeek', 'staff.reception.nextWeek'],
  day: ['staff.reception.prevDay', 'staff.reception.nextDay'],
  list: ['staff.reception.prevDay', 'staff.reception.nextDay'],
};

const STATUS_KEYS: Record<string, string> = {
  Pending: 'staff.status.pending',
  Confirmed: 'staff.status.confirmed',
  Completed: 'staff.status.completed',
  Cancelled: 'staff.status.cancelled',
  'No Show': 'staff.status.noShow',
};

interface CalendarToolbarProps {
  view: ViewMode;
  date: Date;
  onViewChange: (view: ViewMode) => void;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
}

/** Period navigation, visible range and the view switcher. */
export function CalendarToolbar({ view, date, onViewChange, onStep, onToday }: CalendarToolbarProps) {
  const { t } = useTranslation();
  const [prevKey, nextKey] = STEP_LABELS[view];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onStep(-1)} aria-label={t(prevKey)}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant={isToday(date) ? 'secondary' : 'outline'} size="sm" className="h-9" onClick={onToday}>
            {t('staff.reception.today')}
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onStep(1)} aria-label={t(nextKey)}>
            <ChevronRight />
          </Button>
        </div>
        <h2 className="min-w-0 truncate text-base font-semibold text-foreground" aria-live="polite">
          {rangeLabel(view, date, t('staff.calendar.nextThirtyDays'))}
        </h2>
      </div>
      <ToggleGroup type="single" size="sm" value={view} onValueChange={(value) => value && onViewChange(value as ViewMode)} aria-label={t('staff.reception.view')} className="self-start sm:self-auto">
        {VIEWS.map(({ mode, icon: Icon, labelKey }) => (
          <ToggleGroupItem key={mode} value={mode} aria-label={t(labelKey)} className="gap-1.5 capitalize">
            <Icon aria-hidden="true" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

interface CalendarFiltersProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function CalendarFilters({ search, status, onSearchChange, onStatusChange }: CalendarFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('staff.calendar.search')}
          aria-label={t('staff.calendar.searchLabel')}
          className="h-9 pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t('staff.calendar.statusFilter')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">{t('staff.calendar.allStatuses')}</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(STATUS_KEYS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
