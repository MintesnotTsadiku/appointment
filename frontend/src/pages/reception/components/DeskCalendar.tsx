import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { AppointmentCard } from './AppointmentCard';
import { EditAppointmentModal } from './EditAppointmentModal';
import { OverflowAppointmentsModal } from './OverflowAppointmentsModal';
import { Appointment, ViewMode, TimeSlotInterval } from '../types';
import { format, parseISO, addDays, startOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Loader2, CalendarX } from 'lucide-react';

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [overflowAppointments, setOverflowAppointments] = useState<{ date: Date; appointments: Appointment[] } | null>(null);

  const { call: rescheduleAppointment } = useFrappePostCall(
    'appointment.scheduler.api.desk.reschedule_appointment'
  );

  // Generate time slots based on interval (8 AM - 8 PM)
  // For 15min: 8:00, 8:15, 8:30, 8:45, 9:00, etc.
  // For 30min: 8:00, 8:30, 9:00, 9:30, etc.
  // For 45min: 8:00, 8:45, 9:30, 10:15, etc.
  // For 60min: 8:00, 9:00, 10:00, etc.
  const timeSlots = (() => {
    const slots: { hour: number; minute: number }[] = [];
    const startHour = 8;
    const endHour = 20;
    const slotsPerHour = 60 / timeSlotInterval;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let i = 0; i < slotsPerHour; i++) {
        slots.push({
          hour,
          minute: i * timeSlotInterval
        });
      }
    }
    return slots;
  })();

  // Calculate slot height based on interval
  const slotHeight = (60 / timeSlotInterval) * (72 / (60 / 30)); // Base: 72px per 30min, scale by interval
  const baseSlotHeight = 72; // Base height for 30min slots
  const slotHeightPx = (baseSlotHeight * 30) / timeSlotInterval; // Scale inversely with interval

  // Get dates for current view
  const dates = viewMode === 'day'
    ? [currentDate]
    : (() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
      })();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const appointment = appointments.find((apt) => apt.name === event.active.id);
    setDraggedAppointment(appointment || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setDraggedAppointment(null);

    if (!event.over) return;

    const appointment = appointments.find((apt) => apt.name === event.active.id);
    if (!appointment) return;

    const slotId = event.over.id as string;
    const match = slotId.match(/slot-(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)/);
    if (!match) return;

    const [, dateStr, hourStr, minuteStr] = match;
    const newDate = parseISO(dateStr);
    const newHour = parseInt(hourStr, 10);
    const newMinute = parseInt(minuteStr, 10);

    const originalStart = parseISO(`${appointment.appointment_date}T${appointment.start_time}`);
    const originalEnd = parseISO(`${appointment.appointment_date}T${appointment.end_time}`);
    const duration = (originalEnd.getTime() - originalStart.getTime()) / 1000 / 60;

    const newStart = new Date(newDate);
    newStart.setHours(newHour, newMinute, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    // Check if the time actually changed
    const originalStartTime = format(originalStart, 'yyyy-MM-dd HH:mm');
    const newStartTimeStr = format(newStart, 'yyyy-MM-dd HH:mm');
    
    // If time didn't change, don't do anything
    if (originalStartTime === newStartTimeStr) {
      return;
    }

    const newStartTime = format(newStart, 'yyyy-MM-dd HH:mm:ss');
    const newEndTime = format(newEnd, 'yyyy-MM-dd HH:mm:ss');

    try {
      const result = await rescheduleAppointment({
        appointment_name: appointment.name,
        new_start_time: newStartTime,
        new_end_time: newEndTime,
      });

      if (result?.message?.success) {
        toast.success('Appointment rescheduled', {
          description: `Moved to ${format(newStart, 'MMM d, h:mm a')}`,
        });
        onAppointmentUpdate();
      } else {
        toast.error('Reschedule failed', {
          description: result?.message?.error || 'Unable to reschedule appointment',
        });
      }
    } catch (error: any) {
      toast.error('Reschedule failed', {
        description: error?.message || 'An error occurred',
      });
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      if (!apt.appointment_date) return false;
      const aptDate = parseISO(apt.appointment_date);
      return isSameDay(aptDate, date);
    });
  };

  // Detect overlapping appointments and calculate column positions
  const calculateAppointmentLayouts = (appointments: Appointment[]) => {
    if (!appointments.length) return new Map();

    // Sort appointments by start time
    const sorted = [...appointments].sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      const aTime = parseISO(`${a.appointment_date}T${a.start_time}`);
      const bTime = parseISO(`${b.appointment_date}T${b.start_time}`);
      return aTime.getTime() - bTime.getTime();
    });

    // Group appointments by overlapping time ranges
    const groups: Appointment[][] = [];
    const layouts = new Map<string, { 
      top: number; 
      height: number; 
      left: number; 
      width: number; 
      column: number; 
      totalColumns: number;
      isOverflow?: boolean;
      overflowCount?: number;
      overflowAppointments?: Appointment[];
      overflowDate?: Date;
    }>();

    for (const apt of sorted) {
      if (!apt.start_time || !apt.end_time) continue;

      const aptStart = parseISO(`${apt.appointment_date}T${apt.start_time}`);
      const aptEnd = parseISO(`${apt.appointment_date}T${apt.end_time}`);

      // Find which group this appointment belongs to (overlaps with)
      let addedToGroup = false;
      for (const group of groups) {
        // Check if this appointment overlaps with any in this group
        const overlaps = group.some(existingApt => {
          if (!existingApt.start_time || !existingApt.end_time) return false;
          const existingStart = parseISO(`${existingApt.appointment_date}T${existingApt.start_time}`);
          const existingEnd = parseISO(`${existingApt.appointment_date}T${existingApt.end_time}`);
          
          // Check for overlap: start < existingEnd && end > existingStart
          return aptStart < existingEnd && aptEnd > existingStart;
        });

        if (overlaps) {
          group.push(apt);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([apt]);
      }
    }

    // Calculate positions for each group
    for (const group of groups) {
      // Sort group by start time again
      group.sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        const aTime = parseISO(`${a.appointment_date}T${a.start_time}`);
        const bTime = parseISO(`${b.appointment_date}T${b.start_time}`);
        return aTime.getTime() - bTime.getTime();
      });

      // Calculate columns for overlapping appointments
      const columns: Appointment[][] = [];
      
      for (const apt of group) {
        if (!apt.start_time || !apt.end_time) continue;
        
        const aptStart = parseISO(`${apt.appointment_date}T${apt.start_time}`);
        const aptEnd = parseISO(`${apt.appointment_date}T${apt.end_time}`);

        // Find first column where this appointment doesn't overlap
        let placed = false;
        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const column = columns[colIndex];
          const noOverlap = column.every(existingApt => {
            if (!existingApt.start_time || !existingApt.end_time) return true;
            const existingStart = parseISO(`${existingApt.appointment_date}T${existingApt.start_time}`);
            const existingEnd = parseISO(`${existingApt.appointment_date}T${existingApt.end_time}`);
            return aptEnd <= existingStart || aptStart >= existingEnd;
          });

          if (noOverlap) {
            column.push(apt);
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([apt]);
        }
      }

      // Calculate layout for each appointment in the group
      const totalColumns = columns.length;
      const maxVisiblePerColumn = 3; // Show max 3 appointments per column, then "+X more"
      
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const columnAppointments = columns[colIndex];
        const visibleCount = Math.min(columnAppointments.length, maxVisiblePerColumn);
        const overflowCount = Math.max(0, columnAppointments.length - maxVisiblePerColumn);
        const overflowAppointments = overflowCount > 0 ? columnAppointments.slice(maxVisiblePerColumn) : [];
        
        for (let aptIndex = 0; aptIndex < columnAppointments.length; aptIndex++) {
          const apt = columnAppointments[aptIndex];
          if (!apt.start_time || !apt.end_time) continue;

          const [hours, minutes] = apt.start_time.split(':').map(Number);
          const [endHours, endMinutes] = apt.end_time.split(':').map(Number);
          
          // Calculate position based on time slot interval
          const startMinutes = hours * 60 + minutes;
          const endMinutesTotal = endHours * 60 + endMinutes;
          const startSlotMinutes = startMinutes - (8 * 60); // Offset from 8 AM
          const duration = endMinutesTotal - startMinutes;
          
          const top = (startSlotMinutes / timeSlotInterval) * slotHeightPx;
          // Calculate height based on actual duration, with a reasonable minimum
          const calculatedHeight = (duration / timeSlotInterval) * slotHeightPx;
          const height = Math.max(calculatedHeight, 60); // Minimum 60px, but prefer actual duration

          // Calculate width and left position based on column
          // Use percentage-based positioning with proper spacing
          const gapPercent = 0.5; // 0.5% gap between columns
          const paddingPercent = 1; // 1% padding on each side
          const availableWidth = 100 - (paddingPercent * 2); // Available width after padding
          const totalGapWidth = gapPercent * (totalColumns - 1);
          const columnWidth = (availableWidth - totalGapWidth) / totalColumns;
          const left = paddingPercent + (colIndex * (columnWidth + gapPercent));

          const isOverflow = aptIndex >= maxVisiblePerColumn;
          const aptDate = apt.appointment_date ? parseISO(apt.appointment_date) : new Date();
          
          layouts.set(apt.name, {
            top,
            height,
            left,
            width: columnWidth,
            column: colIndex,
            totalColumns,
            isOverflow,
            overflowCount: isOverflow ? 0 : (aptIndex === maxVisiblePerColumn - 1 ? overflowCount : 0),
            overflowAppointments: isOverflow ? [] : (aptIndex === maxVisiblePerColumn - 1 ? overflowAppointments : []),
            overflowDate: aptDate,
          });
        }
      }
    }

    return layouts;
  };

  const getAppointmentPosition = (appointment: Appointment) => {
    if (!appointment.start_time) return null;

    const [hours, minutes] = appointment.start_time.split(':').map(Number);
    const [endHours, endMinutes] = appointment.end_time?.split(':').map(Number) || [hours + 1, minutes];

    // Calculate position based on time slot interval
    const startMinutes = hours * 60 + minutes;
    const endMinutesTotal = endHours * 60 + endMinutes;
    const startSlotMinutes = startMinutes - (8 * 60); // Offset from 8 AM
    const duration = endMinutesTotal - startMinutes;
    
    const top = (startSlotMinutes / timeSlotInterval) * slotHeightPx;
    // Calculate height based on actual duration, with a reasonable minimum
    const calculatedHeight = (duration / timeSlotInterval) * slotHeightPx;
    const height = Math.max(calculatedHeight, 60); // Minimum 60px, but prefer actual duration

    return { top, height };
  };

  const DroppableTimeSlot = ({ date, slot }: { date: Date; slot: { hour: number; minute: number } }) => {
    const slotId = `slot-${format(date, 'yyyy-MM-dd')}-${slot.hour}-${slot.minute}`;
    const { setNodeRef, isOver } = useDroppable({ id: slotId });
    const now = new Date();
    const isPast = isToday(date) && (
      slot.hour < now.getHours() || 
      (slot.hour === now.getHours() && slot.minute < now.getMinutes())
    );

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger click if we're currently dragging
      if (activeId) {
        return;
      }
      if (onCreateAppointment) {
        const slotDate = new Date(date);
        slotDate.setHours(slot.hour, slot.minute, 0, 0);
        onCreateAppointment(slotDate, `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
      }
    };

    const handleDoubleClick = () => {
      // Don't trigger if we're currently dragging
      if (activeId) {
        return;
      }
      if (onCreateAppointment) {
        const slotDate = new Date(date);
        slotDate.setHours(slot.hour, slot.minute, 0, 0);
        onCreateAppointment(slotDate, `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
      }
    };

    // Only show time label on the hour or based on interval
    const showTimeLabel = slot.minute === 0 || (timeSlotInterval <= 30 && slot.minute % 30 === 0);

    return (
      <div
        ref={setNodeRef}
        className="relative group transition-all duration-200 cursor-pointer"
        style={{ 
          height: `${slotHeightPx}px`,
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: isOver 
            ? 'var(--accent-primary-light)' 
            : isPast 
              ? 'var(--bg-secondary)' 
              : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isOver && !isPast) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOver && !isPast) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title={`Click to create appointment at ${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`}
      >
        {showTimeLabel && (
          <div className="absolute left-2 top-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {slot.hour.toString().padStart(2, '0')}:{slot.minute.toString().padStart(2, '0')}
          </div>
        )}
        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-1 border-2 border-dashed rounded-lg"
            style={{ borderColor: 'var(--accent-primary)' }}
          />
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div 
        className="backdrop-blur-sm rounded-2xl h-[700px] flex items-center justify-center"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div className="text-center">
          <Loader2 
            className="w-8 h-8 animate-spin mx-auto mb-3" 
            style={{ color: 'var(--accent-primary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading appointments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div 
        className="backdrop-blur-sm rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        {viewMode === 'day' ? (
          // Day View
          <div className="flex">
            {/* Time column */}
            <div 
              className="w-20 flex-shrink-0"
              style={{ borderRight: '1px solid var(--border-subtle)' }}
            >
              <div 
                className="h-16 flex items-center justify-center"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="text-center">
                  <div 
                    className="text-sm font-semibold"
                    style={{ color: isToday(currentDate) ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  >
                    {format(currentDate, 'EEE')}
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: isToday(currentDate) ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {format(currentDate, 'd')}
                  </div>
                </div>
              </div>
              {/* Time labels - show only on the hour */}
              {timeSlots.filter(slot => slot.minute === 0).map((slot) => (
                <div
                  key={`${slot.hour}-${slot.minute}`}
                  className="flex items-start justify-end pr-3 pt-1"
                  style={{ 
                    height: `${slotHeightPx * (60 / timeSlotInterval)}px`,
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <span 
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {slot.hour.toString().padStart(2, '0')}:{slot.minute.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day column */}
            <div className="flex-1 relative" style={{ paddingLeft: '12px' }}>
              <div 
                className="h-16"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              />
              
              {/* Time slots */}
              {timeSlots.map((slot, index) => (
                <DroppableTimeSlot key={`${slot.hour}-${slot.minute}-${index}`} date={currentDate} slot={slot} />
              ))}

              {/* Current time indicator */}
              {isToday(currentDate) && (() => {
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const startSlotMinutes = nowMinutes - (8 * 60);
                const topPosition = 64 + (startSlotMinutes / timeSlotInterval) * slotHeightPx;
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{
                      top: `${topPosition}px`,
                    }}
                  >
                  <div className="flex items-center">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-lg"
                      style={{ 
                        backgroundColor: 'var(--status-cancelled)',
                        boxShadow: `0 0 8px var(--status-cancelled)`
                      }}
                    />
                    <div 
                      className="flex-1 h-0.5"
                      style={{ 
                        background: `linear-gradient(to right, var(--status-cancelled), transparent)`
                      }}
                    />
                  </div>
                </motion.div>
                );
              })()}

              {/* Appointments */}
              {(() => {
                const dayAppointments = getAppointmentsForDate(currentDate);
                const layouts = calculateAppointmentLayouts(dayAppointments);
                
                return dayAppointments.map((appointment) => {
                  const layout = layouts.get(appointment.name);
                  if (!layout) {
                    const position = getAppointmentPosition(appointment);
                    if (!position) return null;
                    return (
                      <motion.div
                        key={appointment.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute z-10"
                        style={{ 
                          top: `${position.top + 64}px`, 
                          height: `${position.height}px`,
                          left: '0px',
                          right: '12px',
                          minWidth: 0,
                          maxWidth: '100%',
                          padding: '4px'
                        }}
                      >
                        <AppointmentCard 
                          appointment={appointment} 
                          onEdit={setEditingAppointment}
                          onClick={setEditingAppointment}
                          timeSlotInterval={timeSlotInterval}
                        />
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={appointment.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute z-10"
                      style={{ 
                        top: `${layout.top + 64}px`, 
                        height: `${layout.height}px`,
                        left: `calc(${layout.left}% + 0px)`,
                        width: `calc(${layout.width}% - ${layout.totalColumns > 1 ? '0.5%' : '0px'})`,
                        paddingRight: layout.totalColumns > 1 ? '0.5%' : '0',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '4px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <AppointmentCard 
                        appointment={appointment} 
                        onEdit={setEditingAppointment}
                        onClick={setEditingAppointment}
                        compact={layout.totalColumns > 1}
                        timeSlotInterval={timeSlotInterval}
                      />
                    </motion.div>
                  );
                });
              })()}

              {/* Empty state */}
              {getAppointmentsForDate(currentDate).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center py-12">
                    <CalendarX 
                      className="w-12 h-12 mx-auto mb-3" 
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No appointments scheduled
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Click "New Appointment" to create one
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Week View
          <div className="overflow-x-auto">
            <div className="flex min-w-[900px]">
              {/* Time column */}
              <div 
                className="w-16 flex-shrink-0"
                style={{ borderRight: '1px solid var(--border-subtle)' }}
              >
                <div 
                  className="h-16"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                />
                {/* Time labels - show only on the hour */}
                {timeSlots.filter(slot => slot.minute === 0).map((slot) => (
                  <div
                    key={`${slot.hour}-${slot.minute}`}
                    className="flex items-start justify-end pr-2 pt-1"
                    style={{ 
                      height: `${slotHeightPx * (60 / timeSlotInterval)}px`,
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <span 
                      className="text-[10px] font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {slot.hour.toString().padStart(2, '0')}:{slot.minute.toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days */}
              {dates.map((date) => {
                const dayAppointments = getAppointmentsForDate(date);
                const isTodayDate = isToday(date);

                return (
                  <div 
                    key={date.toString()} 
                    className="flex-1 min-w-[120px] relative"
                    style={{ borderRight: '1px solid var(--border-subtle)' }}
                  >
                    {/* Day header */}
                    <div 
                      className="h-16 p-2 text-center sticky top-0 z-10"
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isTodayDate 
                          ? 'var(--accent-primary-light)' 
                          : 'var(--bg-elevated)'
                      }}
                    >
                      <div 
                        className="text-xs font-medium"
                        style={{ color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                      >
                        {format(date, 'EEE')}
                      </div>
                      <div 
                        className="text-xl font-bold"
                        style={{ color: isTodayDate ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        {format(date, 'd')}
                      </div>
                    </div>

                    {/* Time slots */}
                    {timeSlots.map((slot, index) => (
                      <DroppableTimeSlot key={`${slot.hour}-${slot.minute}-${index}`} date={date} slot={slot} />
                    ))}

                    {/* Current time indicator */}
                    {isTodayDate && (() => {
                      const now = new Date();
                      const nowMinutes = now.getHours() * 60 + now.getMinutes();
                      const startSlotMinutes = nowMinutes - (8 * 60);
                      const topPosition = 64 + (startSlotMinutes / timeSlotInterval) * slotHeightPx;
                      return (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{
                            top: `${topPosition}px`,
                          }}
                        >
                        <div 
                          className="h-0.5"
                          style={{ 
                            background: `linear-gradient(to right, var(--status-cancelled), var(--status-cancelled), transparent)`
                          }}
                        />
                      </div>
                      );
                    })()}

                    {/* Appointments */}
                    {(() => {
                      const layouts = calculateAppointmentLayouts(dayAppointments);
                      
                      return dayAppointments.map((appointment) => {
                        const layout = layouts.get(appointment.name);
                        if (!layout) {
                          const position = getAppointmentPosition(appointment);
                          if (!position) return null;
                          return (
                            <motion.div
                              key={appointment.name}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute z-10"
                              style={{ 
                                top: `${position.top + 64}px`, 
                                height: `${position.height}px`,
                                left: '0px',
                                right: '8px',
                                minWidth: 0,
                                maxWidth: '100%',
                                padding: '4px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <AppointmentCard 
                                appointment={appointment} 
                                compact 
                                onEdit={setEditingAppointment}
                                onClick={setEditingAppointment}
                                timeSlotInterval={timeSlotInterval}
                              />
                            </motion.div>
                          );
                        }

                        // Skip rendering overflow appointments
                        if (layout.isOverflow) return null;

                        return (
                          <motion.div
                            key={appointment.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute z-10"
                            style={{ 
                              top: `${layout.top + 64}px`, 
                              height: `${layout.height}px`,
                              left: `calc(${layout.left}% + 0px)`,
                              width: `calc(${layout.width}% - ${layout.totalColumns > 1 ? '0.5%' : '0px'})`,
                              paddingRight: layout.totalColumns > 1 ? '0.5%' : '0',
                              minWidth: 0,
                              maxWidth: '100%',
                              padding: '4px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <AppointmentCard 
                              appointment={appointment} 
                              compact 
                              onEdit={setEditingAppointment}
                              onClick={setEditingAppointment}
                              timeSlotInterval={timeSlotInterval}
                            />
                            {/* "+X more" button */}
                            {layout.overflowCount && layout.overflowCount > 0 && layout.overflowAppointments && (
                              <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOverflowAppointments({
                                    date: layout.overflowDate || date,
                                    appointments: layout.overflowAppointments || [],
                                  });
                                }}
                                className="absolute bottom-0 left-0 right-0 p-1 rounded-b-lg text-[10px] font-medium transition-all"
                                style={{ 
                                  backgroundColor: 'var(--bg-elevated)',
                                  color: 'var(--accent-primary)',
                                  borderTop: '1px solid var(--border-default)'
                                }}
                              >
                                +{layout.overflowCount} more
                              </motion.button>
                            )}
                          </motion.div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {draggedAppointment ? (
          <div className="opacity-90 rotate-2 scale-105" style={{ maxWidth: '300px' }}>
            <AppointmentCard appointment={draggedAppointment} isDragging compact={false} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Overflow Appointments Modal */}
      {overflowAppointments && (
        <OverflowAppointmentsModal
          isOpen={!!overflowAppointments}
          onClose={() => setOverflowAppointments(null)}
          date={overflowAppointments.date}
          appointments={overflowAppointments.appointments}
          onEdit={(apt) => {
            setOverflowAppointments(null);
            setEditingAppointment(apt);
          }}
          onNavigateToDay={onNavigateToDay}
          viewMode={viewMode}
        />
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <EditAppointmentModal
          isOpen={!!editingAppointment}
          onClose={() => setEditingAppointment(null)}
          appointment={editingAppointment}
          onSuccess={() => {
            setEditingAppointment(null);
            onAppointmentUpdate();
          }}
        />
      )}
    </DndContext>
  );
};
