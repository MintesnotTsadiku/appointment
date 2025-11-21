/**
 * Hook to fetch organization data and services from Frappe API
 * Connects to: 
 * - frappe_appointment.api.personal_meet.get_organization_services (list services)
 * - frappe_appointment.api.personal_meet.get_organization_meeting_windows (specific service)
 */

import { useFrappeGetCall } from "frappe-react-sdk";
import { useEffect, useState } from "react";
import type { Organization, Service } from "../types";

interface UseOrganizationDataParams {
  orgSlug: string;
  serviceSlug?: string;
}

interface OrganizationServicesResponse {
  full_name: string;
  company: string;
  position?: string;
  profile_pic?: string;
  banner_image?: string;
  meeting_provider?: string;
  services?: Array<{
    name: string;
    slug: string;
    description?: string;
    duration: number;
    price?: number;
    type: "individual" | "organization" | "group";
    provider_name?: string;
    provider_id?: string;
    service_id: string;
    url: string;
  }>;
  providers?: Array<{
    id: string;
    name: string;
    designation?: string;
    avatar?: string;
    services?: string[];
  }>;
  provider_count?: number;
}

interface OrganizationMeetingWindowsResponse {
  full_name: string;
  company: string;
  position?: string;
  profile_pic?: string;
  banner_image?: string;
  meeting_provider?: string;
  durations?: Array<{
    id: string;
    label: string;
    duration: number;
  }>;
  organization_id?: string;
  service_id?: string;
  provider_count?: number;
  providers?: Array<{
    id: string;
    name: string;
    services?: string[];
  }>;
}

export function useOrganizationData({
  orgSlug,
  serviceSlug,
}: UseOrganizationDataParams) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Determine which API endpoint to use
  const apiEndpoint = serviceSlug
    ? "frappe_appointment.api.personal_meet.get_organization_meeting_windows"
    : "frappe_appointment.api.personal_meet.get_organization_services";

  const apiParams = serviceSlug
    ? { org_slug: orgSlug, service_slug: serviceSlug }
    : { org_slug: orgSlug };

  // Fetch organization data
  const { data, isLoading, error } = useFrappeGetCall<{
    message: OrganizationServicesResponse | OrganizationMeetingWindowsResponse;
  }>(apiEndpoint, apiParams, undefined, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    errorRetryCount: 3,
  });

  // Transform API response to Organization format
  useEffect(() => {
    if (!data?.message) return;

    const response = data.message;

    // Build organization object
    const org: Organization = {
      id: orgSlug,
      slug: orgSlug,
      name: response.company || response.full_name || "",
      logo: response.profile_pic,
      banner: response.banner_image,
      description: "", // Backend doesn't provide this yet
      providers: (response.providers || []).map((p) => ({
        id: p.id,
        name: p.name,
        designation: p.services ? undefined : response.position,
        avatar: undefined, // Backend doesn't provide this yet
        services: p.services,
      })),
      services: [],
    };

    setOrganization(org);

    // If this is a service list response
    if ("services" in response && response.services) {
      const transformedServices: Service[] = response.services.map((s) => ({
        id: s.service_id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
        currency: "ETB",
        type: s.type,
        provider: s.provider_id
          ? {
              id: s.provider_id,
              name: s.provider_name || "",
            }
          : undefined,
        providerCount: response.provider_count,
      }));

      setServices(transformedServices);
      org.services = transformedServices;
    }

    // If this is a specific service response with durations
    if ("durations" in response && response.durations && serviceSlug) {
      // Create a service object from the duration info
      const service: Service = {
        id: response.service_id || serviceSlug,
        slug: serviceSlug,
        name: response.full_name || serviceSlug,
        duration: response.durations[0]?.duration || 30,
        type: "organization",
        providerCount: response.provider_count,
      };

      setSelectedService(service);
    }
  }, [data, orgSlug, serviceSlug]);

  return {
    organization,
    services,
    selectedService,
    organizationId: (data?.message as OrganizationMeetingWindowsResponse)
      ?.organization_id,
    serviceId: (data?.message as OrganizationMeetingWindowsResponse)?.service_id,
    durations:
      (data?.message as OrganizationMeetingWindowsResponse)?.durations || [],
    isLoading,
    error,
  };
}
