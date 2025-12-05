import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { 
  format, parseISO, isSameDay, isToday, isSameMonth, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths
} from 'date-fns';
import { Task } from '@/lib/tasks-assistants/types';
import { TaskCalendarCard } from './TaskCalendarCard';
import { ViewMode, TimeSlotInterval } from '../types';
import { isOverdue } from '@/lib/tasks-assistants/utils';

interface TasksCalendarProps {
  tasks: Task[];
  currentDate: Date;
  viewMode: ViewMode;
  timeSlotInterval: TimeSlotInterval;
  isLoading?: boolean;
  onCreateTask?: (date: Date, time?: string) => void;
  onTaskClick?: (task: Task) => void;
  onNavigateToDay?: (date: Date) => void;
}

export const TasksCalendar = ({
  tasks,
  currentDate,
  viewMode,
  timeSlotInterval,
  isLoading,
  onCreateTask,
  onTaskClick,
  onNavigateToDay,
}: TasksCalendarProps) => {
  // Helper function to extract date from deadline
  const getTaskDate = (task: Task): Date | null => {
    if (!task.deadline) return null;
    try {
      return parseISO(task.deadline);
    } catch (e) {
      return null;
    }
  };

  // Helper function to extract time from deadline
  const getTaskTime = (task: Task): { hour: number; minute: number } | null => {
    if (!task.deadline) return null;
    try {
      const deadline = parseISO(task.deadline);
      return {
        hour: deadline.getHours(),
        minute: deadline.getMinutes(),
      };
    } catch (e) {
      return null;
    }
  };

  // Filter tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((task) => {
      const taskDate = getTaskDate(task);
      if (!taskDate) {
        // Tasks without deadline - show at bottom or today based on preference
        return isToday(date);
      }
      return format(taskDate, 'yyyy-MM-dd') === dateStr;
    });
  };

  // Get tasks without deadlines
  const tasksWithoutDeadline = useMemo(() => {
    return tasks.filter((task) => !task.deadline);
  }, [tasks]);

  // Generate time slots based on interval (8 AM - 8 PM)
  const timeSlots = useMemo(() => {
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
  }, [timeSlotInterval]);

  // Calculate slot height based on interval
  const slotHeightPx = useMemo(() => {
    const baseSlotHeight = 72; // Base height for 30min slots
    return (baseSlotHeight * 30) / timeSlotInterval;
  }, [timeSlotInterval]);

  // Get position for a task in time slots
  const getTaskPosition = (task: Task): { top: number; height: number } | null => {
    const time = getTaskTime(task);
    if (!time) return null;

    const startMinutes = time.hour * 60 + time.minute;
    const startSlotMinutes = startMinutes - (8 * 60); // Offset from 8 AM
    
    // Default height: 1 hour (60 minutes)
    const duration = task.estimated_duration || 60;
    
    const top = (startSlotMinutes / timeSlotInterval) * slotHeightPx;
    const height = Math.max((duration / timeSlotInterval) * slotHeightPx, 60);

    return { top, height };
  };

  // Calculate overlapping task layouts
  const calculateTaskLayouts = (dayTasks: Task[]) => {
    const layouts = new Map<string, { 
      top: number; 
      height: number; 
      left: number; 
      width: number; 
      column: number; 
      totalColumns: number;
    }>();

    if (!dayTasks.length) return layouts;

    // Sort tasks by deadline time
    const sorted = [...dayTasks].sort((a, b) => {
      const timeA = getTaskTime(a);
      const timeB = getTaskTime(b);
      if (!timeA || !timeB) return 0;
      
      const minutesA = timeA.hour * 60 + timeA.minute;
      const minutesB = timeB.hour * 60 + timeB.minute;
      return minutesA - minutesB;
    });

    // Group overlapping tasks
    const groups: Task[][] = [];
    
    for (const task of sorted) {
      const time = getTaskTime(task);
      if (!time) continue;

      const taskStart = time.hour * 60 + time.minute;
      const taskDuration = task.estimated_duration || 60;
      const taskEnd = taskStart + taskDuration;

      let addedToGroup = false;
      for (const group of groups) {
        const overlaps = group.some(existingTask => {
          const existingTime = getTaskTime(existingTask);
          if (!existingTime) return false;
          
          const existingStart = existingTime.hour * 60 + existingTime.minute;
          const existingDuration = existingTask.estimated_duration || 60;
          const existingEnd = existingStart + existingDuration;
          
          return taskStart < existingEnd && taskEnd > existingStart;
        });

        if (overlaps) {
          group.push(task);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([task]);
      }
    }

    // Calculate positions for each group
    for (const group of groups) {
      const columns: Task[][] = [];
      
      for (const task of group) {
        const time = getTaskTime(task);
        if (!time) continue;

        const taskStart = time.hour * 60 + time.minute;
        const taskDuration = task.estimated_duration || 60;
        const taskEnd = taskStart + taskDuration;

        let placed = false;
        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const column = columns[colIndex];
          const noOverlap = column.every(existingTask => {
            const existingTime = getTaskTime(existingTask);
            if (!existingTime) return true;
            
            const existingStart = existingTime.hour * 60 + existingTime.minute;
            const existingDuration = existingTask.estimated_duration || 60;
            const existingEnd = existingStart + existingDuration;
            
            return taskEnd <= existingStart || taskStart >= existingEnd;
          });

          if (noOverlap) {
            column.push(task);
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([task]);
        }
      }

      // Calculate layout for each task
      const totalColumns = columns.length;
      const gapPercent = 0.5;
      const paddingPercent = 1;
      const availableWidth = 100 - (paddingPercent * 2);
      const totalGapWidth = gapPercent * (totalColumns - 1);
      const columnWidth = (availableWidth - totalGapWidth) / totalColumns;

      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const columnTasks = columns[colIndex];
        
        for (const task of columnTasks) {
          const position = getTaskPosition(task);
          if (!position) continue;

          const left = paddingPercent + (colIndex * (columnWidth + gapPercent));

          layouts.set(task.name, {
            top: position.top,
            height: position.height,
            left,
            width: columnWidth,
            column: colIndex,
            totalColumns,
          });
        }
      }
    }

    return layouts;
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
            Loading tasks...
          </p>
        </div>
      </div>
    );
  }

  // Month View
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div 
        className="backdrop-blur-sm rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div 
          className="grid grid-cols-7 gap-px"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          {/* Week day headers */}
          {weekDays.map(day => (
            <div 
              key={day} 
              className="p-2 text-center text-sm font-semibold"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)'
              }}
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map(day => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toString()}
                className={`p-2 min-h-[100px] border-l border-t ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isTodayDate ? 'ring-2' : ''}`}
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  ...(isTodayDate ? { 
                    ringColor: 'var(--accent-primary)',
                    ringWidth: '2px'
                  } : {})
                }}
                onClick={() => onNavigateToDay?.(day)}
              >
                <div 
                  className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ 
                    color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => {
                    const overdue = isOverdue(task);
                    const priorityColor = task.priority === 'urgent' || overdue ? 'var(--status-cancelled)' : 
                                        task.priority === 'high' ? 'var(--accent-secondary)' :
                                        task.status === 'completed' ? 'var(--accent-success)' : 'var(--text-muted)';
                    
                    return (
                      <button
                        key={task.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                        className="w-full text-left text-xs px-2 py-1 rounded border truncate hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `${priorityColor}20`,
                          borderColor: `${priorityColor}50`,
                          color: 'var(--text-primary)',
                        }}
                        title={`${task.title} - ${formatDateTime(task.deadline || '')}`}
                      >
                        <div className="font-medium truncate">{task.title}</div>
                        {task.deadline && (
                          <div className="text-[10px] opacity-75 truncate">
                            {format(parseISO(task.deadline), 'HH:mm')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Week View
  if (viewMode === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div 
        className="backdrop-blur-sm rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div className="flex min-w-full">
          {/* Time column */}
          <div 
            className="w-20 flex-shrink-0"
            style={{ borderRight: '1px solid var(--border-subtle)' }}
          >
            <div 
              className="h-16 flex items-center justify-center"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            />
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

          {/* Days */}
          {weekDays.map(day => {
            const dayTasks = getTasksForDate(day);
            const isTodayDate = isToday(day);
            const layouts = calculateTaskLayouts(dayTasks);

            return (
              <div 
                key={day.toString()} 
                className="flex-1 relative"
                style={{ 
                  borderRight: '1px solid var(--border-subtle)',
                  paddingLeft: '12px'
                }}
              >
                <div 
                  className="h-16 flex items-center justify-center"
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: isTodayDate ? 'var(--accent-primary-light)' : 'transparent'
                  }}
                >
                  <div className="text-center">
                    <div 
                      className="text-sm font-semibold"
                      style={{ color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                    >
                      {format(day, 'EEE')}
                    </div>
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: isTodayDate ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                </div>
                
                {/* Time slots */}
                <div className="relative">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={`${slot.hour}-${slot.minute}-${index}`}
                      className="relative transition-all duration-200 cursor-pointer"
                      style={{ 
                        height: `${slotHeightPx}px`,
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                      onDoubleClick={() => {
                        if (onCreateTask) {
                          const slotDate = new Date(day);
                          slotDate.setHours(slot.hour, slot.minute, 0, 0);
                          onCreateTask(slotDate, `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
                        }
                      }}
                    />
                  ))}

                  {/* Tasks */}
                  {dayTasks.map((task) => {
                    const layout = layouts.get(task.name);
                    if (!layout) {
                      const position = getTaskPosition(task);
                      if (!position) return null;
                      
                      return (
                        <motion.div
                          key={task.name}
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
                          <TaskCalendarCard 
                            task={task} 
                            onClick={onTaskClick}
                            timeSlotInterval={timeSlotInterval}
                          />
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={task.name}
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
                        <TaskCalendarCard 
                          task={task} 
                          onClick={onTaskClick}
                          compact={layout.totalColumns > 1}
                          timeSlotInterval={timeSlotInterval}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Day View
  if (viewMode === 'day') {
    const dayTasks = getTasksForDate(currentDate);
    const isTodayDate = isToday(currentDate);
    const layouts = calculateTaskLayouts(dayTasks);

    return (
      <div 
        className="backdrop-blur-sm rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
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
                  style={{ color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                  {format(currentDate, 'EEE')}
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: isTodayDate ? 'var(--text-primary)' : 'var(--text-secondary)' }}
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
              <div
                key={`${slot.hour}-${slot.minute}-${index}`}
                className="relative transition-all duration-200 cursor-pointer"
                style={{ 
                  height: `${slotHeightPx}px`,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onDoubleClick={() => {
                  if (onCreateTask) {
                    const slotDate = new Date(currentDate);
                    slotDate.setHours(slot.hour, slot.minute, 0, 0);
                    onCreateTask(slotDate, `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
                  }
                }}
              />
            ))}

            {/* Tasks */}
            {dayTasks.map((task) => {
              const layout = layouts.get(task.name);
              if (!layout) {
                const position = getTaskPosition(task);
                if (!position) return null;
                
                return (
                  <motion.div
                    key={task.name}
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
                    <TaskCalendarCard 
                      task={task} 
                      onClick={onTaskClick}
                      timeSlotInterval={timeSlotInterval}
                    />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={task.name}
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
                  <TaskCalendarCard 
                    task={task} 
                    onClick={onTaskClick}
                    compact={layout.totalColumns > 1}
                    timeSlotInterval={timeSlotInterval}
                  />
                </motion.div>
              );
            })}

            {/* Tasks without deadline - show at bottom */}
            {tasksWithoutDeadline.length > 0 && (
              <div 
                className="mt-4 p-4 border-t"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  marginTop: `${(timeSlots.length * slotHeightPx) + 64}px`
                }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Tasks without Deadline
                </h3>
                <div className="space-y-2">
                  {tasksWithoutDeadline.map(task => (
                    <motion.div
                      key={task.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onTaskClick?.(task)}
                      className="p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                      }}
                    >
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  if (viewMode === 'list') {
    // Sort tasks by deadline (tasks without deadline at end)
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = getTaskDate(a);
      const dateB = getTaskDate(b);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Tasks without deadline go to end
      if (!dateB) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });

    // Group by date
    const tasksByDate = new Map<string, Task[]>();
    sortedTasks.forEach(task => {
      const taskDate = getTaskDate(task);
      if (!taskDate) {
        // Group tasks without deadline separately
        const key = 'no-deadline';
        if (!tasksByDate.has(key)) {
          tasksByDate.set(key, []);
        }
        tasksByDate.get(key)!.push(task);
        return;
      }
      
      const dateKey = format(taskDate, 'yyyy-MM-dd');
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey)!.push(task);
    });

    if (sortedTasks.length === 0) {
      return (
        <div 
          className="backdrop-blur-sm rounded-2xl h-[700px] flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No tasks found</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="backdrop-blur-sm rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
          {Array.from(tasksByDate.entries()).map(([dateKey, dateTasks]) => {
            const isNoDeadline = dateKey === 'no-deadline';
            const date = isNoDeadline ? null : parseISO(dateKey);
            
            return (
              <div key={dateKey} className="space-y-3">
                {/* Date header */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  <h3 
                    className="text-sm font-semibold px-4"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {isNoDeadline 
                      ? 'Tasks without Deadline' 
                      : date 
                        ? format(date, 'EEEE, MMMM d, yyyy')
                        : dateKey
                    }
                  </h3>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                </div>
                
                {/* Tasks for this date */}
                <div className="space-y-2">
                  {dateTasks.map(task => {
                    const overdue = isOverdue(task);
                    const taskDate = getTaskDate(task);
                    
                    return (
                      <motion.div
                        key={task.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onTaskClick?.(task)}
                        className="p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: overdue ? 'var(--accent-secondary-light)' : 'var(--bg-secondary)',
                          borderColor: overdue ? 'var(--accent-secondary)' : 'var(--border-default)',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {task.title}
                              </h4>
                            </div>
                            {task.description && (
                              <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {task.deadline && taskDate && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {format(taskDate, 'MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span>{format(taskDate, 'HH:mm')}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

// Helper to format date/time - need to import from utils
const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, HH:mm');
  } catch (e) {
    return '';
  }
};

