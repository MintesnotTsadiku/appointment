import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DeskHeader } from './components/DeskHeader';
import { DeskFilters } from './components/DeskFilters';
import { DeskCalendar } from './components/DeskCalendar';
import { WalkInQueue } from './components/WalkInQueue';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { AddWalkInModal } from './components/AddWalkInModal';
import AppTopNav from '@/components/workspace/AppTopNav';
import { InsightBrief } from '@/components/analytics/WorkspaceDashboard';
import { useSession } from '@/context/session';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ViewMode, Appointment, Location, Provider, TimeSlotInterval } from './types';
import { Calendar, Users, Clock, TrendingUp, AlertTriangle, CalendarClock, RotateCcw } from 'lucide-react';

const Reception = () => {
  const { session } = useSession();
  const organization = session?.selected?.organization;
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
    message: {
      appointments: Appointment[];
      count: number;
      unfiltered_count: number;
      timezone: string;
      next_date: string | null;
      scope: { organization: string | null; organization_name: string | null; is_manager: boolean; receptionist: boolean };
    };
  }>(
    'appointment.scheduler.api.desk.get_desk_appointments',
    {
      date: format(currentDate, 'yyyy-MM-dd'),
      location_name: selectedLocation || undefined,
      provider_name: selectedProvider || undefined,
      view: viewMode,
      organization: organization || undefined,
    },
    `appointments-${dateRange.start}-${dateRange.end}-${selectedLocation || 'all'}-${selectedProvider || 'all'}-${viewMode}-${organization || 'all'}`,
    {
      revalidateOnFocus: true,
    }
  );

  // Fetch locations and providers for filters
  const { data: locationsData } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.scheduler.api.desk.get_locations_list',
    organization ? { organization } : undefined,
    `locations-${organization || 'all'}`
  );

  const { data: providersData } = useFrappeGetCall<{ message: { providers: Provider[] } }>(
    'appointment.scheduler.api.desk.get_providers_list',
    organization ? { organization } : undefined,
    `providers-${organization || 'all'}`
  );

  const appointments = appointmentsData?.message?.appointments || [];
  const unfilteredCount = appointmentsData?.message?.unfiltered_count ?? appointments.length;
  const deskScope = appointmentsData?.message?.scope;
  const deskTimezone = appointmentsData?.message?.timezone;
  const nextDate = appointmentsData?.message?.next_date;
  const filtersActive = Boolean(selectedLocation || selectedProvider);
  const locations = locationsData?.message?.locations || [];
  const providers = providersData?.message?.providers || [];

  // Calculate stats
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
      label: "Visible appointments",
      value: appointments.length,
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

  // No authorized staff context: explain instead of showing a blank calendar.
  if (session && !session.authenticated) {
    return <div role="alert" className="p-8">Please sign in to open reception.</div>;
  }
  if (session && session.state === 'no_assignment') {
    return (
      <div role="alert" className="p-8" style={{ color: 'var(--text-primary)' }}>
        <h1 className="text-xl font-semibold">Reception is not assigned to you</h1>
        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Ask a manager to assign you a reception scope.</p>
        <Link className="mt-4 inline-block underline" to="/workspaces">Choose a business</Link>
      </div>
    );
  }

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
        <AppTopNav active="reception" />
        <div className="px-4 sm:px-6"><InsightBrief kind="reception" /></div>
        {/* Sticky Top Section: Header + Stats + Filters */}
        <div 
          className="sticky top-0 z-40"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Active scope bar: business, date, time zone and filters */}
          <div
            data-qa="reception-scope"
            className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-1 px-6 pt-3 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {deskScope?.organization_name || session?.selected?.business_name || 'All authorized businesses'}
            </span>
            <span>Date: {format(currentDate, 'EEE, dd MMM yyyy')}</span>
            <span>Time zone: {deskTimezone || 'Africa/Addis_Ababa'}</span>
            <span>
              Filters: {selectedLocation ? `location ${locations.find((loc) => loc.name === selectedLocation)?.location_name || selectedLocation}` : 'all locations'}
              {selectedProvider ? ` · provider ${providers.find((prov) => prov.name === selectedProvider)?.provider_name || selectedProvider}` : ''}
            </span>
            {(selectedLocation || selectedProvider) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation(null);
                  setSelectedProvider(null);
                }}
                className="underline"
              >
                Reset filters
              </button>
            )}
          </div>
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

          {/* Loading / error / empty state, distinguished from a blank calendar */}
          {appointmentsError && (
            <div role="alert" data-qa="reception-error" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--status-cancelled-bg, #fee2e2)', color: 'var(--status-cancelled, #b91c1c)' }}>
              <AlertTriangle className="h-5 w-5" />
              <span>Unable to load appointments. This may be a connection problem, not an empty day.</span>
              <button className="underline" onClick={() => void refreshAppointments()}>
                <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}
          {!appointmentsError && !appointmentsLoading && appointments.length === 0 && (
            <div data-qa="reception-empty" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <CalendarClock className="h-5 w-5" />
              {filtersActive && unfilteredCount > 0 ? (
                <>
                  <span>{unfilteredCount} appointment(s) exist here but are filtered out.</span>
                  <button className="underline" data-qa="reception-reset-filters" onClick={() => { setSelectedLocation(null); setSelectedProvider(null); }}>
                    Reset filters
                  </button>
                </>
              ) : (
                <>
                  <span>No bookings on {format(currentDate, 'dd MMM yyyy')}.</span>
                  {nextDate && (
                    <button className="underline" data-qa="reception-next-booking" onClick={() => setCurrentDate(new Date(nextDate))}>
                      Jump to next booking ({nextDate})
                    </button>
                  )}
                  <Link className="underline" to="/settings/business">Publish a booking page</Link>
                </>
              )}
            </div>
          )}

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
