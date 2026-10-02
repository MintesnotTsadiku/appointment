import { CalendarX2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Bone, ErrorState } from '@/components/states';
import { weekDays } from './dates';
import { ListView } from './ListView';
import { MonthView } from './MonthView';
import { TimeGridView } from './TimeGridView';
import type { Appointment, ViewMode } from './types';

interface CalendarBodyProps {
  view: ViewMode;
  date: Date;
  selectedDay: Date;
  appointments: Appointment[];
  forDay: (day: Date) => Appointment[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpen: (apt: Appointment) => void;
}

/** Picks the active view and handles its loading, error and empty states. */
export function CalendarBody(props: CalendarBodyProps) {
  const { t } = useTranslation();
  const { view, date, appointments, forDay, loading, error, onRetry, onOpenDay, onOpen } = props;
  if (loading) return <CalendarSkeleton />;
  if (error) return <ErrorState className="m-4" description={t('staff.calendar.loadError')} onRetry={onRetry} />;
  if (view === 'list') return <ListView appointments={appointments} onOpen={onOpen} />;
  return (
    <>
      {appointments.length === 0 && <EmptyPeriodNote />}
      {view === 'month' && <MonthView date={date} selectedDay={props.selectedDay} forDay={forDay} onSelectDay={props.onSelectDay} onOpenDay={onOpenDay} onOpen={onOpen} />}
      {view === 'week' && <TimeGridView days={weekDays(date)} forDay={forDay} onOpen={onOpen} onOpenDay={onOpenDay} />}
      {view === 'day' && <TimeGridView days={[date]} forDay={forDay} onOpen={onOpen} />}
    </>
  );
}

function EmptyPeriodNote() {
  const { t } = useTranslation();
  return (
    <p role="status" className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      <CalendarX2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t('staff.calendar.emptyPeriod')}
    </p>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
      <Bone className="h-6 w-full" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => (
          <Bone key={i} className="h-14 rounded-lg sm:h-24" />
        ))}
      </div>
    </div>
  );
}
