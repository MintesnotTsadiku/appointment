import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { AlertTriangle, CalendarClock, RotateCcw } from 'lucide-react';
import { DeskHeader } from './components/DeskHeader';
import { DeskFilters } from './components/DeskFilters';
import { DeskCalendar } from './components/DeskCalendar';
import { WalkInQueue } from './components/WalkInQueue';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { AddWalkInModal } from './components/AddWalkInModal';
import { DeskStats } from './components/DeskStats';
import { StaffShell } from '@/components/staff-shell';
import { InsightBrief } from '@/components/analytics/WorkspaceDashboard';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { ViewMode, Appointment, Location, Provider, TimeSlotInterval } from './types';

const Reception = () => {
  const { session } = useSession();
  const { t } = useTranslation();
  const organization = session?.selected?.organization;
  const [searchParams] = useSearchParams();
  // `?date=YYYY-MM-DD` opens reception on that day (local midnight).
  const [currentDate, setCurrentDate] = useState(() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(searchParams.get('date') || '');
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date();
  });
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [timeSlotInterval, setTimeSlotInterval] = useState<TimeSlotInterval>(30);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const { data: resourceData } = useFrappeGetCall<{ message: Array<{ name: string; resource_name: string }> }>(
    'appointment.scheduler.resources.options', organization ? { organization } : undefined, organization ? `resource-options-${organization}` : null
  );
  const resourceOptions = resourceData?.message ?? [];
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
      resource: selectedResource || undefined,
      view: viewMode,
      organization: organization || undefined,
    },
    `appointments-${dateRange.start}-${dateRange.end}-${selectedLocation || 'all'}-${selectedProvider || 'all'}-${selectedResource || 'all'}-${viewMode}-${organization || 'all'}`,
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
  const filtersActive = Boolean(selectedLocation || selectedProvider || selectedResource);
  const locations = locationsData?.message?.locations || [];
  const providers = providersData?.message?.providers || [];

  const confirmedCount = appointments.filter((apt) => apt.status === 'Confirmed').length;
  const pendingCount = appointments.filter((apt) => apt.status === 'Pending').length;
  const resetFilters = () => {
    setSelectedLocation(null);
    setSelectedProvider(null);
  };

  if (session && !session.authenticated) {
    return <div role="alert" className="p-8">Please sign in to open reception.</div>;
  }
  if (session && session.state === 'no_assignment') {
    return (
      <StaffShell width="default">
        <EmptyState
          icon={CalendarClock}
          title={t('staff.reception.notAssigned')}
          description={t('staff.reception.notAssignedHint')}
          action={<Button asChild variant="outline" size="sm"><Link to="/workspaces">{t('staff.reception.chooseBusiness')}</Link></Button>}
        />
      </StaffShell>
    );
  }

  const locationLabel = selectedLocation ? locations.find((loc) => loc.name === selectedLocation)?.location_name || selectedLocation : null;
  const providerLabel = selectedProvider ? providers.find((prov) => prov.name === selectedProvider)?.provider_name || selectedProvider : null;
  const resourceLabel = selectedResource ? resourceOptions.find((item) => item.name === selectedResource)?.resource_name || selectedResource : null;

  return (
    <StaffShell width="full">
      <div className="space-y-3">
        <section className="space-y-3 rounded-xl border bg-card p-3 shadow-card sm:p-4">
          <DeskHeader
            currentDate={currentDate}
            viewMode={viewMode}
            timeSlotInterval={timeSlotInterval}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
            onTimeSlotIntervalChange={setTimeSlotInterval}
            onCreateAppointment={() => setShowCreateModal(true)}
          />
          <div className="flex flex-col gap-3 border-t pt-3 xl:flex-row xl:items-center xl:justify-between">
            <DeskFilters
              locations={locations}
              providers={providers}
              resources={resourceOptions}
              selectedLocation={selectedLocation}
              selectedProvider={selectedProvider}
              selectedResource={selectedResource}
              onLocationChange={setSelectedLocation}
              onProviderChange={setSelectedProvider}
              onResourceChange={setSelectedResource}
            />
            <DeskStats visible={appointments.length} confirmed={confirmedCount} pending={pendingCount} providers={providers.length} />
          </div>
          <p data-qa="reception-scope" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{deskScope?.organization_name || session?.selected?.business_name || t('staff.reception.allBusinesses')}</span>
            <span>{t('staff.reception.date')}: {format(currentDate, 'EEE, dd MMM yyyy')}</span>
            <span>{t('staff.reception.timezone')}: {deskTimezone || 'Africa/Addis_Ababa'}</span>
            <span>
              {t('staff.reception.filters')}: {locationLabel ? `${t('staff.reception.location')} ${locationLabel}` : t('staff.reception.allLocations')}
              {providerLabel ? ` · ${t('staff.reception.provider')} ${providerLabel}` : ''}
              {resourceLabel ? ` · ${t('staff.resources.sectionTitle')} ${resourceLabel}` : ''}
            </span>
          </p>
        </section>

        <InsightBrief kind="reception" />

        {appointmentsError && (
          <Alert variant="destructive" data-qa="reception-error" className="flex flex-wrap items-center gap-3 [&>svg]:static [&>svg~*]:pl-0">
            <AlertTriangle />
            <AlertDescription className="flex-1 text-foreground">{t('staff.reception.loadError')}</AlertDescription>
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshAppointments()}>
              <RotateCcw />
              {t('staff.states.retry')}
            </Button>
          </Alert>
        )}
        {!appointmentsError && !appointmentsLoading && appointments.length === 0 && (
          <Alert data-qa="reception-empty" variant="info" className="flex flex-wrap items-center gap-x-3 gap-y-2 [&>svg]:static [&>svg]:shrink-0 [&>svg~*]:pl-0">
            <CalendarClock />
            {filtersActive && unfilteredCount > 0 ? (
              <>
                <AlertDescription className="text-foreground">{unfilteredCount} {t('staff.reception.filteredOut')}</AlertDescription>
                <Button type="button" size="sm" variant="outline" data-qa="reception-reset-filters" onClick={resetFilters}>
                  {t('staff.reception.clearFilters')}
                </Button>
              </>
            ) : (
              <>
                <AlertDescription className="text-foreground">{t('staff.reception.noBookingsOn')} {format(currentDate, 'dd MMM yyyy')}.</AlertDescription>
                {nextDate && (
                  <Button type="button" size="sm" variant="outline" data-qa="reception-next-booking" onClick={() => setCurrentDate(new Date(nextDate))}>
                    {t('staff.reception.jumpNext')} ({nextDate})
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link to="/settings/business">{t('staff.reception.publishPage')}</Link>
                </Button>
              </>
            )}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-[600px] min-w-0">
            <DeskCalendar
              appointments={appointments}
              currentDate={currentDate}
              viewMode={viewMode}
              timeSlotInterval={timeSlotInterval}
              onAppointmentUpdate={refreshAppointments}
              isLoading={appointmentsLoading}
              onCreateAppointment={(date, time) => {
                setCurrentDate(date);
                setCreateModalDefaultTime(time);
                if (viewMode === 'week') setViewMode('day');
                setShowCreateModal(true);
              }}
              onNavigateToDay={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
            />
          </div>
          <aside className="xl:sticky xl:top-16 xl:h-[calc(100dvh-6rem)]">
            <WalkInQueue
              locationName={selectedLocation}
              onAssignWalkIn={() => refreshAppointments()}
              onCreateWalkIn={() => setShowWalkInModal(true)}
              refreshToken={walkInRefreshToken}
            />
          </aside>
        </div>
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateModalDefaultTime(undefined);
          }}
          onSuccess={() => refreshAppointments()}
          defaultDate={currentDate}
          defaultTime={createModalDefaultTime}
          defaultProvider={selectedProvider || undefined}
          defaultLocation={selectedLocation || undefined}
        />
      )}
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
    </StaffShell>
  );
};

export default Reception;
