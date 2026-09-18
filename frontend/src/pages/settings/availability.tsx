import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  ChevronLeft,
  Save,
  Building2,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { AvailabilityEditor, DaySchedule } from '@/components/availability-editor';
import { AvailabilityTemplates, ProviderAvailabilityTemplates, ServiceAvailabilityTemplates } from '@/components/availability-templates';
import { TimeFormatToggle } from '@/pages/booking-v2/components/shared/TimeFormatToggle';
import type { TimeFormat } from '@/pages/booking-v2/types';
import Spinner from '@/components/spinner';
import { LinkProviderModal } from './modals/LinkProviderModal';

type AvailabilityLevel = 'location' | 'service' | 'provider';

interface AvailabilityData {
  schedule: DaySchedule[];
  use_default_hours: boolean;
  provider?: {
    name: string;
    provider_name: string;
    email: string;
  } | null;
}

const AvailabilitySettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AvailabilityLevel>('location');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  // Initialize with default empty schedule
  const getDefaultSchedule = (): DaySchedule[] => {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map((day) => ({
      day,
      isOpen: false,
      ranges: [],
    }));
  };

  const [locationSchedule, setLocationSchedule] = useState<DaySchedule[]>(getDefaultSchedule());
  const [serviceSchedule, setServiceSchedule] = useState<DaySchedule[]>(getDefaultSchedule());
  const [providerSchedule, setProviderSchedule] = useState<DaySchedule[]>(getDefaultSchedule());
  const [locationUseDefault, setLocationUseDefault] = useState(true);
  const [serviceUseDefault, setServiceUseDefault] = useState(true);
  const [providerUseDefault, setProviderUseDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedServiceLocation, setSelectedServiceLocation] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [linkProviderModalOpen, setLinkProviderModalOpen] = useState(false);

  // Get onboarding progress to determine context
  const { data: progressData, isLoading: loadingProgress } = useFrappeGetCall<{
    message: {
      onboarding_type: 'individual' | 'organization' | null;
      selected_organization?: { name: string; organization_name: string; slug: string } | null;
    }
  }>(
    'appointment.onboarding.get_progress',
    undefined,
    'onboarding-progress-avail'
  );

  // Get locations (filtered by organization if selected, for provider tab)
  const locationsQuery =
    selectedOrganization ? { organization: selectedOrganization } : undefined;

  const { data: locationsData } = useFrappeGetCall<{ 
    message: { locations: Array<{ name: string; location_name: string }> } 
  }>(
    'appointment.onboarding.get_provider_locations',
    locationsQuery,
    `provider-locations-avail-${activeTab}-${selectedOrganization || 'all'}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const buildServiceParams = () => {
    if (activeTab === 'service' && selectedServiceLocation) {
      const params: Record<string, string> = {
        location: selectedServiceLocation,
      };
      if (selectedOrganization) {
        params.organization = selectedOrganization;
      }
      return params;
    }

    if (activeTab === 'provider' && (selectedOrganization || selectedLocation)) {
      const params: Record<string, string> = {};
      if (selectedOrganization) {
        params.organization = selectedOrganization;
      }
      if (selectedLocation) {
        params.location = selectedLocation;
      }
      return params;
    }

    return undefined;
  };

  const serviceParams = buildServiceParams();
  const serviceCacheKey = `provider-services-avail-${activeTab}-${selectedOrganization || 'all'}-${activeTab === 'service' ? (selectedServiceLocation || 'all') : (selectedLocation || 'all')}`;

  const { data: servicesData } = useFrappeGetCall<{ 
    message: { services: Array<{ name: string; service_name: string; organization?: string }> } 
  }>(
    'appointment.onboarding.get_provider_services',
    serviceParams,
    serviceCacheKey,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const getActiveLocationId = () => {
    if (activeTab === 'location') return selectedLocation;
    if (activeTab === 'service') return selectedServiceLocation;
    if (activeTab === 'provider') return selectedLocation;
    return null;
  };

  const locationIdForAvailability = getActiveLocationId();

  // Get availability data
  const { data: locationAvailData, isLoading: loadingLocation } = useFrappeGetCall<{
    message: AvailabilityData;
  }>(
    'appointment.onboarding.get_availability',
    locationIdForAvailability ? { level: 'location', id: locationIdForAvailability } : undefined,
    `location-availability-${locationIdForAvailability || 'none'}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { data: serviceAvailData, isLoading: loadingService } = useFrappeGetCall<{
    message: AvailabilityData;
  }>(
    'appointment.onboarding.get_availability',
    selectedService ? { level: 'service', id: selectedService } : undefined,
    `service-availability-${selectedService}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Fetch providers for the selected service
  const { data: serviceProvidersData, mutate: refreshServiceProviders } = useFrappeGetCall<{
    message: { success: boolean; providers: Array<{ name: string; provider_name: string; email: string; is_primary: boolean }> }
  }>(
    'appointment.onboarding.get_service_providers',
    selectedService ? { service_id: selectedService } : undefined,
    `service-providers-${selectedService || 'none'}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const serviceProviders = serviceProvidersData?.message?.providers || [];

  // Only fetch provider availability if service and provider are selected (provider availability is contextual)
  const { data: providerAvailData, isLoading: loadingProvider } = useFrappeGetCall<{
    message: AvailabilityData;
  }>(
    'appointment.onboarding.get_availability',
    selectedService && selectedProvider ? { level: 'provider', service_id: selectedService, location_id: selectedLocation, provider_id: selectedProvider } : undefined,
    `provider-availability-${selectedService || 'none'}-${selectedProvider || 'none'}-${selectedLocation || 'none'}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { call: saveAvailability, loading: savingAvailability } = useFrappePostCall(
    'appointment.onboarding.save_availability'
  );

  const { call: removeProvider } = useFrappePostCall(
    'appointment.onboarding.remove_provider_from_service'
  );

  const locations = locationsData?.message?.locations || [];
  const services = servicesData?.message?.services || [];
  const selectedOrg = progressData?.message?.selected_organization;
  
  // Get organizations for service filtering
  const { data: orgsData } = useFrappeGetCall<{
    message: { organizations: Array<{ name: string; organization_name: string }> }
  }>(
    'appointment.onboarding.get_user_organizations',
    undefined,
    'user-organizations-avail',
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  const organizations = orgsData?.message?.organizations || [];
  
  // Initialize selected organization from onboarding progress
  useEffect(() => {
    if (selectedOrg && !selectedOrganization) {
      setSelectedOrganization(selectedOrg.name);
    } else if (organizations.length === 1 && !selectedOrganization) {
      setSelectedOrganization(organizations[0].name);
    }
  }, [selectedOrg, organizations, selectedOrganization]);

  // Initialize selected location/service
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].name);
    }
  }, [locations, selectedLocation]);

  useEffect(() => {
    if (activeTab === 'service') {
      const hasLocation = locations.some((loc) => loc.name === selectedServiceLocation);
      if (selectedServiceLocation && !hasLocation) {
        setSelectedServiceLocation(null);
      }
      if (!selectedServiceLocation && locations.length > 0) {
        setSelectedServiceLocation(locations[0].name);
      }
    }
  }, [locations, selectedServiceLocation, activeTab]);

  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].name);
    }
  }, [services, selectedService]);
  
  useEffect(() => {
    if (selectedServiceLocation) {
      setSelectedService(null);
    }
  }, [selectedServiceLocation]);

  // Get provider info from availability data or selected provider
  const providerInfo = providerAvailData?.message?.provider || (selectedProvider ? serviceProviders.find(p => p.name === selectedProvider) : null);

  // Reset selected provider when service changes
  useEffect(() => {
    if (selectedService) {
      // Auto-select first provider if available
      if (serviceProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(serviceProviders[0].name);
      } else if (serviceProviders.length === 0) {
        setSelectedProvider(null);
      } else if (selectedProvider && !serviceProviders.find(p => p.name === selectedProvider)) {
        // Selected provider no longer linked, reset
        setSelectedProvider(serviceProviders.length > 0 ? serviceProviders[0].name : null);
      }
    } else {
      setSelectedProvider(null);
    }
  }, [selectedService, serviceProviders, selectedProvider]);

  useEffect(() => {
    if (selectedOrganization) {
      setSelectedService(null);
      setSelectedServiceLocation(null);
    }
  }, [selectedOrganization]);

  // Load availability data
  useEffect(() => {
    if (locationAvailData?.message) {
      setLocationSchedule(locationAvailData.message.schedule);
      setLocationUseDefault(locationAvailData.message.use_default_hours);
    }
  }, [locationAvailData]);

  useEffect(() => {
    if (serviceAvailData?.message) {
      setServiceSchedule(serviceAvailData.message.schedule);
      setServiceUseDefault(serviceAvailData.message.use_default_hours);
    }
  }, [serviceAvailData]);

  useEffect(() => {
    if (providerAvailData?.message) {
      setProviderSchedule(providerAvailData.message.schedule);
      setProviderUseDefault(providerAvailData.message.use_default_hours);
    }
  }, [providerAvailData]);

  const convertScheduleToOpeningHours = (schedule: DaySchedule[]) => {
    const openingHours: any[] = [];
    schedule.forEach((daySchedule) => {
      if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
        daySchedule.ranges.forEach((range) => {
          openingHours.push({
            day_of_week: daySchedule.day,
            start_time: `${range.start}:00`,
            end_time: `${range.end}:00`,
            is_open: 1,
          });
        });
      } else {
        openingHours.push({
          day_of_week: daySchedule.day,
          start_time: '00:00:00',
          end_time: '00:00:00',
          is_open: 0,
        });
      }
    });
    return openingHours;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let level: AvailabilityLevel;
      let id: string | null = null;
      let schedule: DaySchedule[];
      let useDefault: boolean;

      if (activeTab === 'location') {
        level = 'location';
        id = selectedLocation;
        schedule = locationSchedule;
        useDefault = locationUseDefault;
      } else if (activeTab === 'service') {
        level = 'service';
        id = selectedService;
        schedule = serviceSchedule;
        useDefault = serviceUseDefault;
      } else {
        level = 'provider';
        schedule = providerSchedule;
        useDefault = providerUseDefault;
      }

      const openingHours = convertScheduleToOpeningHours(schedule);

      await saveAvailability({
        level,
        id,
        opening_hours: openingHours,
        use_default_hours: useDefault ? 1 : 0,
        provider_id: activeTab === 'provider' ? selectedProvider : undefined,
      });

      toast.success('Availability saved successfully!', {
        description: `${level.charAt(0).toUpperCase() + level.slice(1)} availability has been updated.`,
        duration: 3000,
      });
    } catch (error: any) {
      toast.error('Failed to save availability', {
        description: error?.message || 'Please try again.',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const getParentSchedule = (): DaySchedule[] | undefined => {
    if (activeTab === 'service' && locationAvailData?.message) {
      return locationAvailData.message.schedule;
    }
    if (activeTab === 'provider') {
      // For provider, show service schedule if available, otherwise location
      if (serviceAvailData?.message) {
        return serviceAvailData.message.schedule;
      }
      if (locationAvailData?.message) {
        return locationAvailData.message.schedule;
      }
    }
    return undefined;
  };

  const isLoading = loadingLocation || loadingService || loadingProvider || loadingProgress;
  const currentSchedule = 
    activeTab === 'location' ? locationSchedule :
    activeTab === 'service' ? serviceSchedule :
    providerSchedule;
  const currentUseDefault = 
    activeTab === 'location' ? locationUseDefault :
    activeTab === 'service' ? serviceUseDefault :
    providerUseDefault;

  const handleScheduleChange = (newSchedule: DaySchedule[]) => {
    if (activeTab === 'location') {
      setLocationSchedule(newSchedule);
    } else if (activeTab === 'service') {
      setServiceSchedule(newSchedule);
    } else {
      setProviderSchedule(newSchedule);
    }
  };

  const handleUseDefaultChange = (useDefault: boolean) => {
    if (activeTab === 'location') {
      setLocationUseDefault(useDefault);
    } else if (activeTab === 'service') {
      setServiceUseDefault(useDefault);
    } else {
      setProviderUseDefault(useDefault);
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/home')}
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
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Availability Settings
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
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Configure availability for locations, services, and providers
                    </p>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={saving || savingAvailability ? {} : { scale: 1.02 }}
                whileTap={saving || savingAvailability ? {} : { scale: 0.98 }}
                onClick={handleSave}
                disabled={saving || savingAvailability}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                }}
              >
                {saving || savingAvailability ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
        ((activeTab === 'location' && selectedLocation) ||
         (activeTab === 'service' && selectedService) ||
         (activeTab === 'provider' && selectedService && providerInfo)) ? 'pb-24' : ''
      }`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Tabs */}
          <div 
            className="p-2 mb-6 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('location')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'location'
                    ? 'bg-gradient-primary text-white'
                    : 'hover:bg-[var(--border-subtle)]'
                }`}
                style={activeTab !== 'location' ? {
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                } : {}}
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Location</span>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('service')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'service'
                    ? 'bg-gradient-primary text-white'
                    : 'hover:bg-[var(--border-subtle)]'
                }`}
                style={activeTab !== 'service' ? {
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                } : {}}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Service</span>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('provider')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'provider'
                    ? 'bg-gradient-primary text-white'
                    : 'hover:bg-[var(--border-subtle)]'
                }`}
                style={activeTab !== 'provider' ? {
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                } : {}}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Provider</span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Tab Content */}
          {isLoading ? (
            <div 
              className="p-12 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center justify-center">
                <Spinner />
              </div>
            </div>
          ) : (
            <div 
              className="p-6 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)'
              }}
            >
              {/* Organization Selector for Services */}
              {activeTab === 'service' && organizations.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Select Organization
                  </label>
                  <select
                    value={selectedOrganization || ''}
                    onChange={(e) => setSelectedOrganization(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">All Organizations</option>
                    {organizations.map((org) => (
                      <option key={org.name} value={org.name}>
                        {org.organization_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Location Selector (Location Tab) */}
              {activeTab === 'location' && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Select Location
                    </label>
                    <select
                      value={selectedLocation || ''}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg transition-all h-[42px]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">Select...</option>
                      {locations.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Time Format Toggle */}
                  {selectedLocation && (
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Time Format
                      </label>
                      <div className="h-[42px] flex items-center">
                        <TimeFormatToggle
                          value={timeFormat}
                          onChange={(format) => setTimeFormat(format)}
                          showLabels={false}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Service Tab: Choose Location before Service */}
              {activeTab === 'service' && (
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Select Location
                      </label>
                      <select
                        value={selectedServiceLocation || ''}
                        onChange={(e) => setSelectedServiceLocation(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg transition-all h-[42px]"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                        disabled={!locations.length}
                      >
                        <option value="">{locations.length ? 'Select a location...' : 'No locations available'}</option>
                        {locations.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.location_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Services are scoped to the selected location.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Time Format
                      </label>
                      <div className="h-[42px] flex items-center">
                        <TimeFormatToggle
                          value={timeFormat}
                          onChange={(format) => setTimeFormat(format)}
                          showLabels={false}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Select Service
                    </label>
                    <select
                      value={selectedService || ''}
                      onChange={(e) => setSelectedService(e.target.value || null)}
                      className="w-full px-3 py-2 rounded-lg transition-all h-[42px]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      disabled={!selectedServiceLocation || services.length === 0}
                    >
                      <option value="">
                        {selectedServiceLocation ? 'Select a service...' : 'Pick a location first'}
                      </option>
                      {services.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.service_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      The list shows services available at the chosen location.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Organization → Location → Service Selector for Provider */}
              {activeTab === 'provider' && (
                <>
                  {organizations.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Select Organization
                      </label>
                      <select
                        value={selectedOrganization || ''}
                        onChange={(e) => setSelectedOrganization(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="">Select an organization...</option>
                        {organizations.map((org) => (
                          <option key={org.name} value={org.name}>
                            {org.organization_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {selectedOrganization && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Select Location
                      </label>
                      <select
                        value={selectedLocation || ''}
                        onChange={(e) => setSelectedLocation(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                        disabled={!selectedOrganization}
                      >
                        <option value="">Select a location...</option>
                        {locations.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.location_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Select a location for this organization
                      </p>
                    </div>
                  )}
                  
                  {selectedOrganization && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Select Service <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                      </label>
                      <select
                        value={selectedService || ''}
                        onChange={(e) => setSelectedService(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                        disabled={!selectedOrganization}
                      >
                        <option value="">Select a service...</option>
                        {services.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.service_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Provider availability must be set for a specific service in this organization
                      </p>
                    </div>
                  )}
                  
                  {/* Provider Info Display */}
                  {selectedService && providerInfo && (
                    <div 
                      className="mb-6 p-4 rounded-lg backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--accent-primary-light)',
                        border: '1px solid var(--accent-primary-light)'
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
                        Editing availability for: <span className="font-semibold">{providerInfo.provider_name}</span>
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Service: {services.find(s => s.name === selectedService)?.service_name || selectedService}
                        {selectedLocation && ` • Location: ${locations.find(l => l.name === selectedLocation)?.location_name || selectedLocation}`}
                      </p>
                    </div>
                  )}
                  
                  {!selectedOrganization && (
                    <div 
                      className="mb-6 p-4 rounded-lg backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--accent-secondary-light)',
                        border: '1px solid var(--accent-secondary-light)'
                      }}
                    >
                      <p className="text-sm" style={{ color: 'var(--accent-secondary)' }}>
                        Please select an organization first, then location, then service to configure provider availability.
                      </p>
                    </div>
                  )}
                  
                  {selectedOrganization && !selectedService && (
                    <div 
                      className="mb-6 p-4 rounded-lg backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--accent-secondary-light)',
                        border: '1px solid var(--accent-secondary-light)'
                      }}
                    >
                      <p className="text-sm" style={{ color: 'var(--accent-secondary)' }}>
                        Please select a service to configure provider availability. Provider availability is contextual and must be set for a specific service.
                      </p>
                    </div>
                  )}
                  
                  {/* Provider Selector */}
                  {selectedService && serviceProviders.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Select Provider <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                        </label>
                        {selectedProvider && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to unlink this provider from the service?`)) {
                                return;
                              }
                              try {
                                await removeProvider({
                                  service_id: selectedService,
                                  provider_id: selectedProvider,
                                });
                                toast.success('Provider unlinked successfully');
                                refreshServiceProviders();
                                setSelectedProvider(null);
                              } catch (error: any) {
                                toast.error('Failed to unlink provider', {
                                  description: error?.message || 'Please try again.',
                                });
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--border-subtle)',
                              border: '1px solid var(--accent-secondary)',
                              color: 'var(--accent-secondary)'
                            }}
                          >
                            Unlink Provider
                          </motion.button>
                        )}
                      </div>
                      <select
                        value={selectedProvider || ''}
                        onChange={(e) => setSelectedProvider(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg transition-all h-[42px]"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="">Select a provider...</option>
                        {serviceProviders.map((provider) => (
                          <option key={provider.name} value={provider.name}>
                            {provider.provider_name}
                            {provider.is_primary && ' (Primary)'}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {serviceProviders.length} provider{serviceProviders.length !== 1 ? 's' : ''} linked to this service
                      </p>
                    </div>
                  )}

                  {selectedService && serviceProviders.length === 0 && (
                    <div 
                      className="mb-6 p-4 rounded-lg backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--accent-secondary-light)',
                        border: '1px solid var(--accent-secondary-light)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm mb-2" style={{ color: 'var(--accent-secondary)' }}>
                            No providers linked to this service.
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Link providers to this service to configure their availability, or edit the service directly to manage providers.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {selectedOrganization && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setLinkProviderModalOpen(true)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              style={{
                                background: 'var(--gradient-primary-from)',
                                backgroundImage: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                                color: 'white'
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                              Link Providers
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              navigate(`/settings/services/${selectedService}`);
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            style={{
                              backgroundColor: 'var(--border-subtle)',
                              border: '1px solid var(--border-default)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Edit Service
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Time Format Toggle for Provider Tab */}
              {activeTab === 'provider' && selectedService && selectedProvider && providerInfo && (
                <div className="mb-6">
                  <TimeFormatToggle
                    value={timeFormat}
                    onChange={(format) => setTimeFormat(format)}
                    showLabels={true}
                  />
                </div>
              )}

              {/* Provider Availability Templates (Provider Tab) */}
              {activeTab === 'provider' && selectedService && selectedProvider && providerInfo && (
                <ProviderAvailabilityTemplates
                  schedule={providerSchedule}
                  onChange={handleScheduleChange}
                  parentSchedule={getParentSchedule()}
                  serviceName={services.find(s => s.name === selectedService)?.service_name}
                  locationName={locations.find(l => l.name === selectedLocation)?.location_name}
                  timeFormat={timeFormat}
                  onUseDefaultChange={handleUseDefaultChange}
                />
              )}

              {/* Availability Templates (Location Tab Only) */}
              {activeTab === 'location' && selectedLocation && (
                <AvailabilityTemplates
                  schedule={currentSchedule}
                  onChange={handleScheduleChange}
                  timeFormat={timeFormat}
                />
              )}

              {/* Service Availability Templates (Service Tab) */}
              {activeTab === 'service' && selectedService && (
                <ServiceAvailabilityTemplates
                  schedule={serviceSchedule}
                  onChange={handleScheduleChange}
                  parentSchedule={locationAvailData?.message?.schedule}
                  locationName={locations.find(l => l.name === selectedServiceLocation)?.location_name}
                  timeFormat={timeFormat}
                  onUseDefaultChange={handleUseDefaultChange}
                />
              )}

              {/* Availability Editor */}
              {((activeTab === 'location' && selectedLocation) ||
                (activeTab === 'service' && selectedService) ||
                (activeTab === 'provider' && selectedService && selectedProvider && providerInfo)) && (
                <AvailabilityEditor
                  schedule={currentSchedule}
                  onChange={handleScheduleChange}
                  useDefaultHours={currentUseDefault}
                  onUseDefaultChange={activeTab === 'location' ? undefined : handleUseDefaultChange}
                  parentSchedule={getParentSchedule()}
                  level={activeTab}
                  timeFormat={timeFormat}
                />
              )}

              {/* Empty State */}
              {((activeTab === 'location' && !selectedLocation) ||
                (activeTab === 'service' && !selectedService)) && (
                <div className="text-center py-12">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-primary mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {activeTab === 'location'
                      ? 'Please select a location to edit availability'
                      : 'Please select a service to edit availability'}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Sticky Save Button at Bottom */}
      {((activeTab === 'location' && selectedLocation) ||
        (activeTab === 'service' && selectedService) ||
        (activeTab === 'provider' && selectedService && selectedProvider && providerInfo)) && (
        <div 
          className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t shadow-lg z-50"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'location' && 'Location availability changes'}
                {activeTab === 'service' && 'Service availability changes'}
                {activeTab === 'provider' && 'Provider availability changes'}
              </div>
              <motion.button
                whileHover={saving || savingAvailability ? {} : { scale: 1.02 }}
                whileTap={saving || savingAvailability ? {} : { scale: 0.98 }}
                onClick={handleSave}
                disabled={saving || savingAvailability}
                className="relative group flex items-center gap-2 px-8 py-3 rounded-xl text-base font-medium text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                }}
              >
                {saving || savingAvailability ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Link Provider Modal */}
      {selectedService && selectedOrganization && (
        <LinkProviderModal
          open={linkProviderModalOpen}
          onOpenChange={setLinkProviderModalOpen}
          serviceId={selectedService}
          serviceName={servicesData?.message?.services?.find((s: { name: string }) => s.name === selectedService)?.service_name || 'Service'}
          organizationId={selectedOrganization}
          onSuccess={() => {
            // Refresh provider list and auto-select first provider if none selected
            refreshServiceProviders();
            setTimeout(() => {
              if (!selectedProvider && serviceProviders.length > 0) {
                setSelectedProvider(serviceProviders[0].name);
              }
            }, 500);
          }}
        />
      )}
      </div>
    </div>
  );
};

export default AvailabilitySettings;
