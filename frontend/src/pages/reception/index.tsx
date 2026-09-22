import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DeskHeader } from './components/DeskHeader';
import { DeskFilters } from './components/DeskFilters';
import { DeskCalendar } from './components/DeskCalendar';
import { WalkInQueue } from './components/WalkInQueue';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { AddWalkInModal } from './components/AddWalkInModal';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ViewMode, Appointment, Location, Provider, TimeSlotInterval } from './types';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';

const Reception = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [timeSlotInterval, setTimeSlotInterval] = useState<TimeSlotInterval>(30);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInRefreshToken, setWalkInRefreshToken] = useState(0);
  const [createModalDefaultTime, setCreateModalDefaultTime] = useState<string | undefined>(undefined);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
      };
    } else {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      return {
        start: dateStr,
        end: dateStr,
      };
    }
  }, [currentDate, viewMode]);

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError, mutate: refreshAppointments } = useFrappeGetCall<{
    message: { appointments: Appointment[]; count: number };
  }>(
    'appointment.scheduler.api.desk.get_desk_appointments',
    {
      date: format(currentDate, 'yyyy-MM-dd'),
      location_name: selectedLocation || undefined,
      provider_name: selectedProvider || undefined,
      view: viewMode,
    },
    `appointments-${dateRange.start}-${dateRange.end}-${selectedLocation || 'all'}-${selectedProvider || 'all'}-${viewMode}`,
    {
      revalidateOnFocus: true,
    }
  );

  // Fetch locations and providers for filters
  const { data: locationsData } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.scheduler.api.desk.get_locations_list',
    undefined,
    'locations'
  );

  const { data: providersData } = useFrappeGetCall<{ message: { providers: Provider[] } }>(
    'appointment.scheduler.api.desk.get_providers_list',
    undefined,
    'providers'
  );

  const appointments = appointmentsData?.message?.appointments || [];
  const locations = locationsData?.message?.locations || [];
  const providers = providersData?.message?.providers || [];

  // Calculate stats
  const todayAppointments = appointments.filter(apt => apt.appointment_date === format(new Date(), 'yyyy-MM-dd'));
  const confirmedCount = appointments.filter(apt => apt.status === 'Confirmed').length;
  const pendingCount = appointments.filter(apt => apt.status === 'Pending').length;

  const handleAppointmentUpdate = () => {
    refreshAppointments();
  };

  const handleCreateWalkIn = () => {
    setShowWalkInModal(true);
  };

  const handleAssignWalkIn = () => {
    refreshAppointments();
  };

  // Stats with dynamic theme colors via CSS variables
  const stats = [
    { 
      label: "Today's Appointments", 
      value: todayAppointments.length, 
      icon: Calendar, 
      gradient: 'bg-gradient-primary' // Uses --gradient-primary-from/to
    },
    { 
      label: 'Confirmed', 
      value: confirmedCount, 
      icon: TrendingUp, 
      gradient: 'bg-gradient-success' // Uses --gradient-success-from/to
    },
    { 
      label: 'Pending', 
      value: pendingCount, 
      icon: Clock, 
      gradient: 'bg-gradient-secondary' // Uses --gradient-secondary-from/to
    },
    { 
      label: 'Providers Active', 
      value: providers.length, 
      icon: Users, 
      customGradient: 'from-blue-500 to-indigo-600' // Keep original for variety
    },
  ];

  if (appointmentsError) return <div role="alert">Unable to load appointments. Please reload to try again.</div>;

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects using theme glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Section: Header + Stats + Filters */}
        <div 
          className="sticky top-0 z-50"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Header */}
          <nav className="px-6 py-2"><Link to="/settings/business" className="underline">Business booking setup</Link></nav>
      <DeskHeader
            currentDate={currentDate}
            viewMode={viewMode}
            timeSlotInterval={timeSlotInterval}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
            onTimeSlotIntervalChange={setTimeSlotInterval}
            onCreateAppointment={() => setShowCreateModal(true)}
          />

          {/* Stats Row - Now part of sticky section */}
          <div 
            className="px-6 pt-4 pb-2 max-w-[1800px] mx-auto"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--bg-primary) 98%, transparent)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl" />
                  <div 
                    className="relative backdrop-blur-sm rounded-xl p-4 hover:bg-[var(--border-subtle)] transition-all duration-300"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex p-2 rounded-lg ${stat.gradient || ''} ${stat.customGradient ? `bg-gradient-to-br ${stat.customGradient}` : ''}`}>
                        <stat.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                        <div 
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Filters - Now part of sticky section */}
          <div 
            className="px-6 py-3 max-w-[1800px] mx-auto"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--bg-primary) 98%, transparent)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <DeskFilters
                locations={locations}
                providers={providers}
                selectedLocation={selectedLocation}
                selectedProvider={selectedProvider}
                onLocationChange={setSelectedLocation}
                onProviderChange={setSelectedProvider}
              />
            </motion.div>
          </div>
        </div>

        <div className="px-6 pb-8 max-w-[1800px] mx-auto">

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            {/* Calendar */}
            <div className="lg:col-span-3 min-h-[600px]">
              <DeskCalendar
                appointments={appointments}
                currentDate={currentDate}
                viewMode={viewMode}
                timeSlotInterval={timeSlotInterval}
                onAppointmentUpdate={handleAppointmentUpdate}
                isLoading={appointmentsLoading}
                onCreateAppointment={(date, time) => {
                  setCurrentDate(date);
                  setCreateModalDefaultTime(time);
                  if (viewMode === 'week') {
                    setViewMode('day');
                  }
                  setShowCreateModal(true);
                }}
                onNavigateToDay={(date) => {
                  setCurrentDate(date);
                  setViewMode('day');
                }}
              />
            </div>

            {/* Walk-in Queue Sidebar */}
            <div className="lg:col-span-1">
              <div className="h-[600px]">
                <WalkInQueue
                  locationName={selectedLocation}
                  onAssignWalkIn={handleAssignWalkIn}
                  onCreateWalkIn={handleCreateWalkIn}
                  refreshToken={walkInRefreshToken}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAppointmentModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateModalDefaultTime(undefined);
            }}
            onSuccess={handleAppointmentUpdate}
            defaultDate={currentDate}
            defaultTime={createModalDefaultTime}
            defaultProvider={selectedProvider || undefined}
            defaultLocation={selectedLocation || undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWalkInModal && (
          <AddWalkInModal
            isOpen={showWalkInModal}
            onClose={() => setShowWalkInModal(false)}
            onSuccess={() => {
              setShowWalkInModal(false);
              setWalkInRefreshToken((token) => token + 1);
            }}
            locations={locations}
            providers={providers}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reception;
