import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, Moon, Sun, Clock } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ViewMode, TimeSlotInterval } from '../types';
import { useTheme } from '@/components/theme-provider';

interface DeskHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  timeSlotInterval: TimeSlotInterval;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onTimeSlotIntervalChange: (interval: TimeSlotInterval) => void;
  onCreateAppointment: () => void;
}

export const DeskHeader = ({
  currentDate,
  viewMode,
  timeSlotInterval,
  onDateChange,
  onViewModeChange,
  onTimeSlotIntervalChange,
  onCreateAppointment,
}: DeskHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const goToToday = () => onDateChange(new Date());
  const goToPrev = () => onDateChange(subDays(currentDate, viewMode === 'week' ? 7 : 1));
  const goToNext = () => onDateChange(addDays(currentDate, viewMode === 'week' ? 7 : 1));

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

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
                  <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 data-qa="reception-heading" className="text-lg lg:text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  Reception
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
                <p className="text-xs hidden lg:block" style={{ color: 'var(--text-subtle)' }}>Appointment Management</p>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-1 lg:gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPrev}
                aria-label="Previous day"
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
                aria-label="Next day"
                data-qa="desk-next-day"
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
                  {viewMode === 'day' 
                    ? format(currentDate, 'EEEE')
                    : `Week ${format(currentDate, 'w')}`
                  }
                </div>
                <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {viewMode === 'day'
                    ? format(currentDate, 'MMM d, yyyy')
                    : `${format(currentDate, 'MMM d')} - ${format(addDays(currentDate, 6), 'MMM d, yyyy')}`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Right side - View Toggle & Actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Time Slot Interval Selector */}
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

            {/* View Mode Toggle */}
            <div 
              className="flex items-center p-0.5 lg:p-1 rounded-lg lg:rounded-xl"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onViewModeChange('day')}
                className="relative px-2.5 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-md lg:rounded-lg transition-all"
                style={{ 
                  color: viewMode === 'day' ? 'var(--text-primary)' : 'var(--text-subtle)'
                }}
              >
                {viewMode === 'day' && (
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
                <span className="relative z-10">Day</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onViewModeChange('week')}
                className="relative px-2.5 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-md lg:rounded-lg transition-all"
                style={{ 
                  color: viewMode === 'week' ? 'var(--text-primary)' : 'var(--text-subtle)'
                }}
              >
                {viewMode === 'week' && (
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
                <span className="relative z-10">Week</span>
              </motion.button>
            </div>

            {/* New Appointment Button */}
            <motion.button
              data-qa="reception-new-appointment"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateAppointment}
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
              <span className="relative z-10 text-white hidden sm:inline">New Appointment</span>
              <span className="relative z-10 text-white sm:hidden">New</span>
              <Sparkles className="relative z-10 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block" />
            </motion.button>

            {/* Theme Toggle - Integrated into header */}
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
