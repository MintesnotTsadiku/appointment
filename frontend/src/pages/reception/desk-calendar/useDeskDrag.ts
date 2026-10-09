import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { intlLocale, useTranslation } from '@/lib/i18n';
import type { Appointment } from '../types';

/** Drag an appointment onto a slot to reschedule it, keeping its duration. */
export function useDeskDrag(appointments: Appointment[], onUpdated: () => void) {
  const { t, language } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragged, setDragged] = useState<Appointment | null>(null);
  const { call: rescheduleAppointment } = useFrappePostCall('appointment.scheduler.api.desk.reschedule_appointment');

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragged(appointments.find((apt) => apt.name === event.active.id) || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setDragged(null);
    if (!event.over) return;
    const appointment = appointments.find((apt) => apt.name === event.active.id);
    const match = (event.over.id as string).match(/slot-(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)/);
    if (!appointment || !match) return;
    const target = moveTarget(appointment, match);
    if (!target) return;
    try {
      const result = await rescheduleAppointment({
        appointment_name: appointment.name,
        new_start_time: format(target.start, 'yyyy-MM-dd HH:mm:ss'),
        new_end_time: format(target.end, 'yyyy-MM-dd HH:mm:ss'),
      });
      if (result?.message?.success) {
        toast.success(t('staff.receptionDesk.toast.rescheduled'), { description: t('staff.receptionDesk.toast.movedTo').replace('{0}', new Intl.DateTimeFormat(intlLocale(language), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(target.start)) });
        onUpdated();
      } else {
        toast.error(t('staff.receptionDesk.toast.rescheduleFailed'), { description: result?.message?.error || t('staff.receptionDesk.toast.tryAgain') });
      }
    } catch (error) {
      toast.error(t('staff.receptionDesk.toast.rescheduleFailed'), { description: (error as { message?: string })?.message || t('staff.receptionDesk.toast.tryAgain') });
    }
  };

  return { activeId, dragged, onDragStart, onDragEnd };
}

/** New start/end for a drop, or null when the start time is unchanged. */
function moveTarget(appointment: Appointment, [, dateStr, hourStr, minuteStr]: RegExpMatchArray) {
  const originalStart = parseISO(`${appointment.appointment_date}T${appointment.start_time}`);
  const originalEnd = parseISO(`${appointment.appointment_date}T${appointment.end_time}`);
  const start = parseISO(dateStr);
  start.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);
  if (format(originalStart, 'yyyy-MM-dd HH:mm') === format(start, 'yyyy-MM-dd HH:mm')) return null;
  return { start, end: new Date(start.getTime() + (originalEnd.getTime() - originalStart.getTime())) };
}
