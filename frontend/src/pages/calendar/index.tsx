import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Download,
  Plus,
  List,
  Grid3x3,
  CalendarDays,
  Clock,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Card } from '@/components/card';
import Spinner from '@/components/spinner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, isSameDay, isSameMonth, isToday, parseISO,
  startOfDay, addHours, setHours, setMinutes, isSameWeek, 
  getWeek, differenceInDays, startOfYear, getDay, eachWeekOfInterval,
  isWithinInterval, getHours, getMinutes } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day' | 'list';

interface Appointment {
  name: string;
  appointment_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service: string;
  service_name: string;
  provider: string;
  provider_name: string;
  location: string;
  location_name: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Pending' | 'No Show';
  amount_paid?: number;
  currency?: string;
  notes?: string;
  event_type?: string;
  event?: string;
}

interface CalendarStats {
  this_week: number;
  upcoming: number;
  completed_this_month: number;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month':
        return {
          start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(currentDate), 'yyyy-MM-dd')
        };
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd')
        };
      case 'day':
        return {
          start: format(currentDate, 'yyyy-MM-dd'),
          end: format(currentDate, 'yyyy-MM-dd')
        };
      case 'list':
        // Show next 30 days for list view
        return {
          start: format(currentDate, 'yyyy-MM-dd'),
          end: format(addDays(currentDate, 30), 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(currentDate), 'yyyy-MM-dd')
        };
    }
  }, [currentDate, viewMode]);

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading, mutate: refreshAppointments } = useFrappeGetCall<{ message: { appointments: Appointment[] } }>(
    'frappe_appointment.dashboard.get_appointments',
    {
      start_date: dateRange.start,
      end_date: dateRange.end,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      service: serviceFilter !== 'All' ? serviceFilter : undefined,
      search: searchQuery || undefined
    },
    `appointments-${dateRange.start}-${dateRange.end}-${statusFilter}-${serviceFilter}-${searchQuery}`,
    {
      revalidateOnFocus: true,
    }
  );

  // Fetch calendar stats
  const { data: statsData } = useFrappeGetCall<{ message: CalendarStats }>(
    'frappe_appointment.dashboard.get_calendar_stats',
    undefined,
    'calendar-stats',
    {
      revalidateOnFocus: true,
    }
  );

  const appointments = appointmentsData?.message?.appointments || [];
  const stats = statsData?.message || { this_week: 0, upcoming: 0, completed_this_month: 0 };

  // Filter appointments by search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter(apt => 
      apt.client_name?.toLowerCase().includes(query) ||
      apt.service_name?.toLowerCase().includes(query) ||
      apt.appointment_id?.toLowerCase().includes(query)
    );
  }, [appointments, searchQuery]);

  // Get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    return filteredAppointments.filter(apt => {
      if (!apt.appointment_date) return false;
      const aptDate = parseISO(apt.appointment_date);
      return isSameDay(aptDate, date);
    });
  }, [filteredAppointments]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'No Show':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  const goToPrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Appointment ID', 'Date', 'Time', 'Client', 'Service', 'Status', 'Amount'];
    const rows = appointments.map(apt => [
      apt.appointment_id || apt.name,
      apt.appointment_date || '',
      `${apt.start_time || ''} - ${apt.end_time || ''}`,
      apt.client_name || '',
      apt.service_name || '',
      apt.status || '',
      `${apt.amount_paid || 0} ${apt.currency || 'ETB'}`
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Month View Component
  const MonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="bg-white dark:bg-gray-900 p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          
          return (
            <div
              key={day.toString()}
              className={`bg-white dark:bg-gray-900 p-2 min-h-[100px] border-l border-t border-gray-200 dark:border-gray-700 ${
                !isCurrentMonth ? 'opacity-50' : ''
              } ${isTodayDate ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(apt => (
                  <button
                    key={apt.name}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`w-full text-left text-xs px-2 py-1 rounded border ${getStatusColor(apt.status)} truncate hover:opacity-80 transition-opacity`}
                    title={`${apt.client_name} - ${apt.service_name} (${apt.start_time})`}
                  >
                    <div className="font-medium truncate">{apt.client_name}</div>
                    <div className="text-[10px] opacity-75 truncate">{apt.start_time}</div>
                  </button>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week View Component
  const WeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-x-auto">
        <div className="flex min-w-full">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
            <div className="h-12 border-b border-gray-200 dark:border-gray-700"></div>
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-200 dark:border-gray-700 px-2 text-xs text-gray-500 dark:text-gray-400">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          {/* Days */}
          {weekDays.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            
            return (
              <div key={day.toString()} className="flex-1 border-r border-gray-200 dark:border-gray-700">
                <div className={`h-12 border-b border-gray-200 dark:border-gray-700 p-2 text-center ${isToday(day) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900'}`}>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</div>
                  <div className={`text-lg font-semibold ${isToday(day) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="relative">
                  {hours.map(hour => (
                    <div key={hour} className="h-16 border-b border-gray-200 dark:border-gray-700"></div>
                  ))}
                  
                  {/* Appointments */}
                  {dayAppointments.map(apt => {
                    if (!apt.start_time) return null;
                    const [hours, minutes] = apt.start_time.split(':').map(Number);
                    const [endHours, endMinutes] = apt.end_time?.split(':').map(Number) || [hours + 1, minutes];
                    const top = (hours * 64) + (minutes / 60 * 64);
                    const height = ((endHours * 60 + endMinutes) - (hours * 60 + minutes)) / 60 * 64;
                    
                    return (
                      <button
                        key={apt.name}
                        onClick={() => setSelectedAppointment(apt)}
                        className={`absolute left-1 right-1 rounded px-2 py-1 text-xs ${getStatusColor(apt.status)} hover:opacity-80 transition-opacity z-10`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        title={`${apt.client_name} - ${apt.service_name}`}
                      >
                        <div className="font-medium truncate">{apt.client_name}</div>
                        <div className="text-[10px] opacity-75">{apt.start_time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Day View Component
  const DayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayAppointments = getAppointmentsForDate(currentDate);

    return (
      <div className="overflow-x-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-200 dark:border-gray-700 px-2 text-sm text-gray-500 dark:text-gray-400">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          {/* Day column */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-200 dark:border-gray-700"></div>
            ))}
            
            {/* Appointments */}
            {dayAppointments.map(apt => {
              if (!apt.start_time) return null;
              const [hours, minutes] = apt.start_time.split(':').map(Number);
              const [endHours, endMinutes] = apt.end_time?.split(':').map(Number) || [hours + 1, minutes];
              const top = (hours * 64) + (minutes / 60 * 64);
              const height = ((endHours * 60 + endMinutes) - (hours * 60 + minutes)) / 60 * 64;
              
              return (
                <button
                  key={apt.name}
                  onClick={() => setSelectedAppointment(apt)}
                  className={`absolute left-2 right-2 rounded px-3 py-2 text-sm ${getStatusColor(apt.status)} hover:opacity-80 transition-opacity z-10`}
                  style={{ top: `${top}px`, height: `${Math.max(height, 40)}px` }}
                >
                  <div className="font-semibold">{apt.client_name}</div>
                  <div className="text-xs opacity-75">{apt.service_name}</div>
                  <div className="text-xs opacity-75">{apt.start_time} - {apt.end_time}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // List View Component
  const ListView = () => {
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
      const dateA = a.appointment_date ? parseISO(a.appointment_date) : new Date(0);
      const dateB = b.appointment_date ? parseISO(b.appointment_date) : new Date(0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    if (sortedAppointments.length === 0) {
      return (
        <div className="text-center py-12">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No appointments found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {sortedAppointments.map(apt => (
          <motion.div
            key={apt.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${getStatusColor(apt.status)} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => setSelectedAppointment(apt)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{apt.client_name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{apt.service_name}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {apt.appointment_date && format(parseISO(apt.appointment_date), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {apt.start_time} - {apt.end_time}
                  </span>
                  {apt.location_name && (
                    <span>{apt.location_name}</span>
                  )}
                </div>
              </div>
              {apt.amount_paid && apt.amount_paid > 0 && (
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {apt.amount_paid} {apt.currency || 'ETB'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render current view
  const renderView = () => {
    if (appointmentsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      );
    }

    switch (viewMode) {
      case 'month':
        return <MonthView />;
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      case 'list':
        return <ListView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header 
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.history.back()}
                  className="p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      My Calendar
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
                    <p className="text-xs lg:text-sm" style={{ color: 'var(--text-subtle)' }}>
                      {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
                      {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
                      {viewMode === 'list' && 'Appointments List'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                  <Plus className="relative z-10 w-4 h-4" />
                  <span className="relative z-10">New Booking</span>
                </motion.button>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                {(['month', 'week', 'day', 'list'] as ViewMode[]).map((mode) => {
                  const icons = {
                    month: Grid3x3,
                    week: CalendarDays,
                    day: Clock,
                    list: List
                  };
                  const labels = {
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    list: 'List'
                  };
                  const Icon = icons[mode];
                  const isActive = viewMode === mode;
                  
                  return (
                    <motion.button
                      key={mode}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode(mode)}
                      className="relative px-3 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-all"
                      style={{ 
                        color: isActive ? 'var(--text-primary)' : 'var(--text-subtle)'
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="viewToggle"
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: 'var(--accent-primary-light)',
                            border: '1px solid var(--accent-primary-light)'
                          }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <span className="hidden sm:inline">{labels[mode]}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToPrev}
                  className="p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToToday}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Today
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToNext}
                  className="p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
        </div>
      </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                placeholder="Search appointments..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="All">All Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                Filters
              </motion.button>
            </div>
          </div>

          {/* Calendar View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="p-6">
              {renderView()}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[
              { label: 'This Week', value: stats.this_week, subtitle: 'appointments', icon: CalendarIcon, gradient: 'bg-gradient-primary' },
              { label: 'Upcoming', value: stats.upcoming, subtitle: 'in next 7 days', icon: Clock, gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
              { label: 'Completed', value: stats.completed_this_month, subtitle: 'this month', icon: CheckCircle, gradient: 'bg-gradient-success' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className="relative group"
              >
                <div 
                  className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex p-2.5 rounded-xl ${stat.gradient}`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {stat.value}
                      </div>
                      <div className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {stat.label}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {stat.subtitle}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAppointment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-default)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
              
              <div 
                className="p-6"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedAppointment.client_name}
                    </h3>
                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                      {selectedAppointment.service_name}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedAppointment(null)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium border"
                    style={{ 
                      backgroundColor: getStatusColor(selectedAppointment.status).includes('blue') ? 'var(--status-pending-bg)' :
                                      getStatusColor(selectedAppointment.status).includes('green') ? 'var(--status-confirmed-bg)' :
                                      getStatusColor(selectedAppointment.status).includes('orange') ? 'var(--accent-warning-light)' :
                                      getStatusColor(selectedAppointment.status).includes('red') ? 'var(--status-cancelled-bg)' :
                                      'var(--border-subtle)',
                      color: getStatusColor(selectedAppointment.status).includes('blue') ? 'var(--status-pending)' :
                             getStatusColor(selectedAppointment.status).includes('green') ? 'var(--status-confirmed)' :
                             getStatusColor(selectedAppointment.status).includes('orange') ? 'var(--accent-warning)' :
                             getStatusColor(selectedAppointment.status).includes('red') ? 'var(--status-cancelled)' :
                             'var(--text-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAppointment.appointment_date && format(parseISO(selectedAppointment.appointment_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Time</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAppointment.start_time} - {selectedAppointment.end_time}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Client Email</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAppointment.client_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Client Phone</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAppointment.client_phone}
                    </p>
                  </div>
                  {selectedAppointment.location_name && (
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Location</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedAppointment.location_name}
                      </p>
                    </div>
                  )}
                  {selectedAppointment.amount_paid && selectedAppointment.amount_paid > 0 && (
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Amount Paid</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedAppointment.amount_paid} {selectedAppointment.currency || 'ETB'}
                      </p>
                    </div>
                  )}
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
                    <p style={{ color: 'var(--text-primary)' }}>{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
