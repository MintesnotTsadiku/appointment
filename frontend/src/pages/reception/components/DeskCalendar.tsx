import { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { addDays, eachDayOfInterval, startOfWeek } from 'date-fns';
import { Bone } from '@/components/states';
import { AppointmentCard } from './AppointmentCard';
import { OwnedBookingActions } from './OwnedBookingActions';
import { EditAppointmentModal } from './EditAppointmentModal';
import { OverflowAppointmentsModal } from './OverflowAppointmentsModal';
import type { Appointment, ViewMode, TimeSlotInterval } from '../types';
import { appointmentsOn, buildTimeSlots, slotHeightFor } from '../desk-calendar/layout';
import { useDeskDrag } from '../desk-calendar/useDeskDrag';
import { DayColumn } from '../desk-calendar/DayColumn';
import { TimeGutter } from '../desk-calendar/TimeGutter';

interface DeskCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  viewMode: ViewMode;
  timeSlotInterval: TimeSlotInterval;
  onAppointmentUpdate: () => void;
  isLoading?: boolean;
  onCreateAppointment?: (date: Date, time?: string) => void;
  onNavigateToDay?: (date: Date) => void;
}

/** Day/week time grid with drag-to-reschedule, click-to-book and edit dialogs. */
export const DeskCalendar = ({
  appointments,
  currentDate,
  viewMode,
  timeSlotInterval,
  onAppointmentUpdate,
  isLoading,
  onCreateAppointment,
  onNavigateToDay,
}: DeskCalendarProps) => {
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [overflow, setOverflow] = useState<{ date: Date; appointments: Appointment[] } | null>(null);
  const drag = useDeskDrag(appointments, onAppointmentUpdate);
  const slots = buildTimeSlots(timeSlotInterval);
  const slotPx = slotHeightFor(timeSlotInterval);
  const week = viewMode === 'week';
  const dates = week
    ? eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6) })
    : [currentDate];

  if (isLoading) return <CalendarSkeleton />;

  return (
    <DndContext onDragStart={drag.onDragStart} onDragEnd={drag.onDragEnd}>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card" data-qa="desk-calendar">
        <div className={week ? 'overflow-x-auto' : undefined}>
          <div className={week ? 'flex min-w-[900px]' : 'flex'}>
            <TimeGutter slots={slots} interval={timeSlotInterval} slotPx={slotPx} className={week ? 'w-14' : 'w-14 sm:w-16'} />
            {dates.map((date) => (
              <DayColumn
                key={date.toString()}
                date={date}
                appointments={appointmentsOn(appointments, date)}
                slots={slots}
                interval={timeSlotInterval}
                slotPx={slotPx}
                week={week}
                dragging={Boolean(drag.activeId)}
                onEdit={setEditing}
                onOverflow={(day, rows) => setOverflow({ date: day, appointments: rows })}
                onCreate={onCreateAppointment}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {drag.dragged ? (
          <div className="rotate-1 scale-105 opacity-90" style={{ maxWidth: '300px' }}>
            <AppointmentCard appointment={drag.dragged} isDragging compact={false} />
          </div>
        ) : null}
      </DragOverlay>

      {overflow && (
        <OverflowAppointmentsModal
          isOpen={!!overflow}
          onClose={() => setOverflow(null)}
          date={overflow.date}
          appointments={overflow.appointments}
          onEdit={(apt) => {
            setOverflow(null);
            setEditing(apt);
          }}
          onNavigateToDay={onNavigateToDay}
          viewMode={viewMode}
        />
      )}

      {editing?.organization ? (
        <OwnedBookingActions appointment={editing} onClose={() => setEditing(null)} onSuccess={onAppointmentUpdate} />
      ) : (
        editing && (
          <EditAppointmentModal
            isOpen={!!editing}
            onClose={() => setEditing(null)}
            appointment={editing}
            onSuccess={() => {
              setEditing(null);
              onAppointmentUpdate();
            }}
          />
        )
      )}
    </DndContext>
  );
};

function CalendarSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card p-4 shadow-card" aria-busy="true">
      <span className="sr-only">Loading appointments...</span>
      <Bone className="mb-4 h-10 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Bone key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
