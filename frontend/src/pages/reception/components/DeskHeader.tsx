import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import type { TimeSlotInterval, ViewMode } from '../types';

interface DeskHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  timeSlotInterval: TimeSlotInterval;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onTimeSlotIntervalChange: (interval: TimeSlotInterval) => void;
  onCreateAppointment: () => void;
}

const INTERVALS: TimeSlotInterval[] = [15, 30, 45, 60];

/** Desk title, date navigation, view and density controls, primary action. */
export const DeskHeader = ({ currentDate, viewMode, timeSlotInterval, onDateChange, onViewModeChange, onTimeSlotIntervalChange, onCreateAppointment }: DeskHeaderProps) => {
  const { t } = useTranslation();
  const step = viewMode === 'week' ? 7 : 1;
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const label = viewMode === 'day' ? format(currentDate, 'EEEE, d MMM yyyy') : `${format(currentDate, 'MMM d')} – ${format(addDays(currentDate, 6), 'MMM d, yyyy')}`;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <h1 data-qa="reception-heading" className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{t('staff.nav.reception')}</h1>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onDateChange(subDays(currentDate, step))} aria-label={viewMode === 'week' ? t('staff.reception.prevWeek') : t('staff.reception.prevDay')}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant={isToday ? 'secondary' : 'outline'} size="sm" className="h-9" onClick={() => onDateChange(new Date())}>
            {t('staff.reception.today')}
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onDateChange(addDays(currentDate, step))} aria-label={viewMode === 'week' ? t('staff.reception.nextWeek') : t('staff.reception.nextDay')} data-qa="desk-next-day">
            <ChevronRight />
          </Button>
        </div>
        <p className="text-sm font-medium text-foreground" aria-live="polite">{label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" size="sm" value={String(timeSlotInterval)} onValueChange={(value) => value && onTimeSlotIntervalChange(Number(value) as TimeSlotInterval)} aria-label={t('staff.reception.interval')} className="hidden md:inline-flex">
          {INTERVALS.map((interval) => (
            <ToggleGroupItem key={interval} value={String(interval)} aria-label={`${interval} ${t('staff.reception.minutes')}`}>
              {interval}m
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup type="single" size="sm" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as ViewMode)} aria-label={t('staff.reception.view')}>
          <ToggleGroupItem value="day">{t('staff.reception.day')}</ToggleGroupItem>
          <ToggleGroupItem value="week">{t('staff.reception.week')}</ToggleGroupItem>
        </ToggleGroup>
        <Button type="button" data-qa="reception-new-appointment" onClick={onCreateAppointment} className="h-9">
          <Plus />
          {t('staff.reception.newAppointment')}
        </Button>
      </div>
    </div>
  );
};
