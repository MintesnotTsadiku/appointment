import { useState } from 'react';
import { isSameMonth, startOfMonth } from 'date-fns';
import { Download } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { StaffShell } from '@/components/staff-shell';
import { InsightBrief } from '@/components/analytics/WorkspaceDashboard';
import { AppointmentDetailDialog } from './AppointmentDetailDialog';
import { CalendarBody } from './CalendarBody';
import { CalendarStats } from './CalendarStats';
import { CalendarFilters, CalendarToolbar } from './CalendarToolbar';
import { stepDate } from './dates';
import { exportAppointmentsCsv } from './exportCsv';
import { useCalendarData } from './useCalendarData';
import type { Appointment, ViewMode } from './types';

/** Provider schedule: month, week, day and list views of the signed-in provider's appointments. */
const Calendar = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>('month');
  const [date, setDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [openAppointment, setOpenAppointment] = useState<Appointment | null>(null);
  const data = useCalendarData({ view, date, status, search });

  const moveTo = (next: Date) => {
    setDate(next);
    // Keep the phone agenda inside the visible month.
    setSelectedDay(isSameMonth(next, new Date()) ? new Date() : startOfMonth(next));
  };
  const openDay = (day: Date) => {
    setDate(day);
    setSelectedDay(day);
    setView('day');
  };

  return (
    <StaffShell
      title={t('staff.calendar.title')}
      description={t('staff.calendar.description')}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => exportAppointmentsCsv(data.loaded)}>
          <Download />
          {t('staff.calendar.exportCsv')}
        </Button>
      }
    >
      <div className="space-y-6">
        <InsightBrief kind="provider" />
        <section className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="space-y-3 border-b p-4">
            <CalendarToolbar view={view} date={date} onViewChange={setView} onStep={(direction) => moveTo(stepDate(view, date, direction))} onToday={() => moveTo(new Date())} />
            <CalendarFilters search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} />
          </div>
          <CalendarBody
            view={view}
            date={date}
            selectedDay={selectedDay}
            appointments={data.appointments}
            forDay={data.forDay}
            loading={data.loading}
            error={data.error}
            onRetry={data.retry}
            onSelectDay={setSelectedDay}
            onOpenDay={openDay}
            onOpen={setOpenAppointment}
          />
        </section>
        <CalendarStats stats={data.stats} loading={data.statsLoading} />
      </div>
      <AppointmentDetailDialog appointment={openAppointment} onClose={() => setOpenAppointment(null)} />
    </StaffShell>
  );
};

export default Calendar;
