import { useEffect, useMemo, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import type { AvailabilityLevel } from '../lib/schedule';

export interface Location { name: string; location_name: string }
export interface Service { name: string; service_name: string; organization?: string }
export interface Organization { name: string; organization_name: string }
export interface ServiceProvider { name: string; provider_name: string; email: string; is_primary: boolean }

const STATIC_QUERY = { revalidateOnFocus: false, revalidateOnReconnect: false };

/** Scope selection (tab, organization, location, service, provider) and the lists that feed it. */
export function useAvailabilityScope() {
  const [activeTab, setActiveTab] = useState<AvailabilityLevel>('location');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedServiceLocation, setSelectedServiceLocation] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const progress = useFrappeGetCall<{
    message: {
      onboarding_type: 'individual' | 'organization' | null;
      selected_organization?: { name: string; organization_name: string; slug: string } | null;
    };
  }>('appointment.onboarding.get_progress', undefined, 'onboarding-progress-avail');

  const locationsQuery = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.onboarding.get_provider_locations',
    selectedOrganization ? { organization: selectedOrganization } : undefined,
    `provider-locations-avail-${activeTab}-${selectedOrganization || 'all'}`,
    STATIC_QUERY
  );

  const serviceLocationKey = activeTab === 'service' ? (selectedServiceLocation || 'all') : (selectedLocation || 'all');
  const servicesQuery = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.onboarding.get_provider_services',
    buildServiceParams(activeTab, selectedOrganization, selectedLocation, selectedServiceLocation),
    `provider-services-avail-${activeTab}-${selectedOrganization || 'all'}-${serviceLocationKey}`,
    STATIC_QUERY
  );

  const providersQuery = useFrappeGetCall<{ message: { success: boolean; providers: ServiceProvider[] } }>(
    'appointment.onboarding.get_service_providers',
    selectedService ? { service_id: selectedService } : undefined,
    `service-providers-${selectedService || 'none'}`,
    STATIC_QUERY
  );

  const orgsQuery = useFrappeGetCall<{ message: { organizations: Organization[] } }>(
    'appointment.onboarding.get_user_organizations',
    undefined,
    'user-organizations-avail',
    STATIC_QUERY
  );

  const locations = useMemo(() => locationsQuery.data?.message?.locations || [], [locationsQuery.data]);
  const services = useMemo(() => servicesQuery.data?.message?.services || [], [servicesQuery.data]);
  const serviceProviders = useMemo(() => providersQuery.data?.message?.providers || [], [providersQuery.data]);
  const organizations = useMemo(() => orgsQuery.data?.message?.organizations || [], [orgsQuery.data]);
  const selectedOrg = progress.data?.message?.selected_organization;

  useEffect(() => {
    if (selectedOrg && !selectedOrganization) setSelectedOrganization(selectedOrg.name);
    else if (organizations.length === 1 && !selectedOrganization) setSelectedOrganization(organizations[0].name);
  }, [selectedOrg, organizations, selectedOrganization]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) setSelectedLocation(locations[0].name);
  }, [locations, selectedLocation]);

  useEffect(() => {
    if (activeTab !== 'service') return;
    const hasLocation = locations.some((loc) => loc.name === selectedServiceLocation);
    if (selectedServiceLocation && !hasLocation) setSelectedServiceLocation(null);
    if (!selectedServiceLocation && locations.length > 0) setSelectedServiceLocation(locations[0].name);
  }, [locations, selectedServiceLocation, activeTab]);

  useEffect(() => {
    if (services.length > 0 && !selectedService) setSelectedService(services[0].name);
  }, [services, selectedService]);

  useEffect(() => {
    if (selectedServiceLocation) setSelectedService(null);
  }, [selectedServiceLocation]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedProvider(null);
    } else if (serviceProviders.length > 0 && !selectedProvider) {
      setSelectedProvider(serviceProviders[0].name);
    } else if (serviceProviders.length === 0) {
      setSelectedProvider(null);
    } else if (selectedProvider && !serviceProviders.find((p) => p.name === selectedProvider)) {
      setSelectedProvider(serviceProviders[0].name); // previously selected provider was unlinked
    }
  }, [selectedService, serviceProviders, selectedProvider]);

  useEffect(() => {
    if (selectedOrganization) {
      setSelectedService(null);
      setSelectedServiceLocation(null);
    }
  }, [selectedOrganization]);

  const failed = progress.error || locationsQuery.error || orgsQuery.error;
  const retry = () => {
    progress.mutate();
    locationsQuery.mutate();
    orgsQuery.mutate();
  };

  return {
    activeTab, setActiveTab,
    selectedLocation, setSelectedLocation,
    selectedService, setSelectedService,
    selectedServiceLocation, setSelectedServiceLocation,
    selectedOrganization, setSelectedOrganization,
    selectedProvider, setSelectedProvider,
    locations, services, serviceProviders, organizations,
    refreshServiceProviders: providersQuery.mutate,
    loadingProgress: progress.isLoading,
    error: failed ?? null,
    retry,
  };
}

export type AvailabilityScope = ReturnType<typeof useAvailabilityScope>;

/** Location for the availability lookup: the service tab has its own location picker. */
export function activeLocationId(scope: AvailabilityScope): string | null {
  return scope.activeTab === 'service' ? scope.selectedServiceLocation : scope.selectedLocation;
}

function buildServiceParams(
  activeTab: AvailabilityLevel,
  organization: string | null,
  location: string | null,
  serviceLocation: string | null
): Record<string, string> | undefined {
  if (activeTab === 'service' && serviceLocation) {
    return { location: serviceLocation, ...(organization ? { organization } : {}) };
  }
  if (activeTab === 'provider' && (organization || location)) {
    return { ...(organization ? { organization } : {}), ...(location ? { location } : {}) };
  }
  return undefined;
}
