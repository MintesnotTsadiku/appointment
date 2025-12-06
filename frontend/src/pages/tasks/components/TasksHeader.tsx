import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronLeft, ChevronRight, Plus, Sparkles, Moon, Sun, Clock } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';
import { ViewMode, TimeSlotInterval } from '../types';
import { useTheme } from '@/components/theme-provider';

interface TasksHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  timeSlotInterval: TimeSlotInterval;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onTimeSlotIntervalChange: (interval: TimeSlotInterval) => void;
  onCreateTask: () => void;
}

export const TasksHeader = ({
  currentDate,
  viewMode,
  timeSlotInterval,
  onDateChange,
  onViewModeChange,
  onTimeSlotIntervalChange,
  onCreateTask,
}: TasksHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const goToToday = () => onDateChange(new Date());
  
  const goToPrev = () => {
    if (viewMode === 'month') {
      onDateChange(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  };
  
  const goToNext = () => {
    if (viewMode === 'month') {
      onDateChange(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const getDateDisplay = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMM d, yyyy');
      default:
        return format(currentDate, 'MMM d, yyyy');
    }
  };

  const getViewLabel = () => {
    switch (viewMode) {
      case 'month':
        return 'Month';
      case 'week':
        return `Week ${format(currentDate, 'w')}`;
      case 'day':
        return format(currentDate, 'EEEE');
      default:
        return '';
    }
  };

  return (
    <div 
      className="backdrop-blur-xl"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <div className="px-4 lg:px-6 py-3 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Title & Navigation */}
          <div className="flex items-center gap-4 lg:gap-6 flex-shrink min-w-0">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                />
                <div className="relative bg-gradient-primary p-2 lg:p-2.5 rounded-xl">
                  <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  Tasks
                  <span 
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                    style={{ 
                      background: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary-light)'
                    }}
                  >
                    PRO
                  </span>
                </h1>
                <p className="text-xs hidden lg:block" style={{ color: 'var(--text-subtle)' }}>Task Management</p>
              </div>
            </div>

            {/* Date Navigation */}
            {viewMode !== 'cards' && (
              <div className="flex items-center gap-1 lg:gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToPrev}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToToday}
                  className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg font-medium text-sm transition-all"
                  style={{ 
                    backgroundColor: isToday ? 'var(--border-default)' : 'var(--border-subtle)',
                    color: isToday ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: `1px solid ${isToday ? 'var(--border-strong)' : 'var(--border-default)'}`
                  }}
                >
                  Today
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToNext}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </motion.button>

                {/* Current Date Display */}
                <div 
                  className="ml-2 lg:ml-4 px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg"
                  style={{ 
                    background: 'linear-gradient(to right, var(--border-subtle), transparent)',
                    borderLeft: '2px solid var(--accent-primary)'
                  }}
                >
                  <div className="text-sm lg:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {getViewLabel()}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    {getDateDisplay()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side - View Toggle & Actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Time Slot Interval Selector - Only for day/week views */}
            {(viewMode === 'day' || viewMode === 'week') && (
              <div 
                className="hidden md:flex items-center gap-1 p-0.5 lg:p-1 rounded-lg lg:rounded-xl"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <Clock className="w-3 h-3 lg:w-4 lg:h-4 mr-1" style={{ color: 'var(--text-muted)' }} />
                {([15, 30, 45, 60] as TimeSlotInterval[]).map((interval) => (
                  <motion.button
                    key={interval}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onTimeSlotIntervalChange(interval)}
                    className="relative px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium rounded-md transition-all"
                    style={{ 
                      color: timeSlotInterval === interval ? 'var(--text-primary)' : 'var(--text-subtle)'
                    }}
                    title={`${interval} minute intervals`}
                  >
                    {timeSlotInterval === interval && (
                      <motion.div
                        layoutId="timeSlotInterval"
                        className="absolute inset-0 rounded-md"
                        style={{
                          background: 'var(--accent-primary-light)',
                          border: '1px solid var(--accent-primary-light)'
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{interval}m</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* View Mode Toggle */}
            <div 
              className="flex items-center p-0.5 lg:p-1 rounded-lg lg:rounded-xl"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              {(['cards', 'kanban', 'day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <motion.button
                  key={mode}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onViewModeChange(mode)}
                  className="relative px-2.5 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-md lg:rounded-lg transition-all capitalize"
                  style={{ 
                    color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-subtle)'
                  }}
                >
                  {viewMode === mode && (
                    <motion.div
                      layoutId="viewToggle"
                      className="absolute inset-0 rounded-md lg:rounded-lg"
                      style={{
                        background: 'var(--accent-primary-light)',
                        border: '1px solid var(--accent-primary-light)'
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{mode}</span>
                </motion.button>
              ))}
            </div>

            {/* Create Task Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateTask}
              className="relative group flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl font-medium text-xs lg:text-sm overflow-hidden"
            >
              <div 
                className="absolute inset-0 transition-all bg-gradient-primary group-hover:opacity-90"
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div 
                  className="absolute inset-0 blur-xl"
                  style={{ 
                    background: 'linear-gradient(to right, var(--accent-primary), var(--accent-primary-hover))'
                  }}
                />
              </div>
              <Plus className="relative z-10 w-4 h-4 text-white" />
              <span className="relative z-10 text-white hidden sm:inline">Create Task</span>
              <span className="relative z-10 text-white sm:hidden">New</span>
              <Sparkles className="relative z-10 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block" />
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg lg:rounded-xl transition-all"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme + "-icon"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "light" ? (
                    <Moon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                </motion.div>
              </AnimatePresence>
              <span 
                className="text-xs lg:text-sm font-medium hidden md:inline"
                style={{ color: theme === "light" ? '#60a5fa' : '#fbbf24' }}
              >
                {theme === "light" ? "Dark" : "Light"}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};


