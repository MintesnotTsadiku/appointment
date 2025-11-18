/**
 * External dependencies
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";

/**
 * Internal dependencies
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { MeetingCardSkeleton, ProfileSkeleton } from "../appointment/components/skeletons";
import MeetingCard from "../appointment/components/meetingCard";
import Booking from "../appointment/components/booking";
import SocialProfiles from "../appointment/components/socialProfiles";
import { useAppContext } from "@/context/app";
import { Skeleton } from "@/components/skeleton";
import { getLocalTimezone } from "@/lib/utils";
import PoweredBy from "@/components/powered-by";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import Typography from "@/components/typography";
import MetaTags from "@/components/meta-tags";
import { Info } from "lucide-react";

const OrganizationAppointment = () => {
  const { orgSlug, serviceSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const type = searchParams.get("type");

  const updateTypeQuery = (type: string) => {
    setSearchParams({ type });
  };

  const navigate = useNavigate();
  const {
    setMeetingId,
    setUserInfo,
    userInfo,
    setDuration,
    setTimeZone,
    meetingDurationCards,
    setMeetingDurationCards,
  } = useAppContext();

  // Use organization-specific API
  // If serviceSlug exists, get meeting windows for that service
  // Otherwise, get list of services
  const apiEndpoint = orgSlug && serviceSlug 
    ? "frappe_appointment.api.personal_meet.get_organization_meeting_windows"
    : orgSlug 
    ? "frappe_appointment.api.personal_meet.get_organization_services"
    : null;
    
  const apiParams = orgSlug && serviceSlug
    ? { org_slug: orgSlug, service_slug: serviceSlug }
    : orgSlug
    ? { org_slug: orgSlug }
    : undefined;
    
  const { data, isLoading, error } = useFrappeGetCall(
    apiEndpoint,
    apiParams,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 3,
    }
  );

  const [friendlyError, setFriendlyError] = useState<string>("");
  const [resolvedType, setResolvedType] = useState<string | null>(null);

  useEffect(() => {
    if (orgSlug && serviceSlug) {
      // For organization booking, use org_slug/service_slug as the meeting ID
      setMeetingId(`${orgSlug}/${serviceSlug}`);
    }
    setTimeZone(getLocalTimezone());
  }, [orgSlug, serviceSlug]);

  // Sync resolvedType with type from URL when it changes
  useEffect(() => {
    if (type && type !== "default") {
      setResolvedType(type);
    } else if (type === "default") {
      setResolvedType(null);
    }
  }, [type]);

  useEffect(() => {
    if (data) {
      setUserInfo({
        name: data?.message?.full_name,
        designation: data?.message?.position,
        organizationName: data?.message?.company,
        userImage: data?.message?.profile_pic,
        socialProfiles: [],
        meetingProvider: data?.message?.meeting_provider,
        banner_image: data?.message?.banner_image,
      });
      
      // If this is a service list (no serviceSlug), don't set durations
      if (data?.message?.durations) {
        setMeetingDurationCards(data?.message?.durations);
        const durations = data?.message?.durations || [];
        if (!type || type === "default") {
          setResolvedType(null);
        }
      }
      
      setFriendlyError("");
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      const errorMessage = error?.message || error?.exception || "Failed to load booking page";
      setFriendlyError(errorMessage);
      if (import.meta.env.DEV) {
        console.error("Organization booking error:", error);
      }
    }
  }, [error]);

  // Auto-select first duration if only one exists and type is missing/default
  useEffect(() => {
    if (meetingDurationCards && meetingDurationCards.length === 1 && (!type || type === "default")) {
      const firstDuration = meetingDurationCards[0];
      if (firstDuration?.id && firstDuration.id !== "default") {
        updateTypeQuery(firstDuration.id);
        setResolvedType(firstDuration.id);
      }
    }
  }, [meetingDurationCards, type]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
          <div className="mt-8">
            <MeetingCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error || friendlyError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {friendlyError || "Sorry, we couldn't find the page you're looking for."}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            The organization or service you're looking for may not exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const selectedDuration = meetingDurationCards?.find((d) => d.id === resolvedType);
  const showSelectionScreen = meetingDurationCards && meetingDurationCards.length > 1 && !resolvedType;
  const showServiceList = !serviceSlug && data?.message?.services;

  return (
    <>
      <MetaTags
        title={`${userInfo?.name || "Book Appointment"} | Scheduler`}
        description={`Schedule an appointment with ${userInfo?.name || "us"}`}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <div className="container mx-auto px-4 pt-8 pb-12 max-w-6xl">
          {/* Profile Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 mt-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={userInfo?.userImage} alt={userInfo?.name} />
                <AvatarFallback>
                  {userInfo?.name?.charAt(0)?.toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <Typography variant="h2" className="mb-2">
                  {userInfo?.name || <Skeleton className="h-8 w-48" />}
                </Typography>
                {userInfo?.designation && (
                  <Typography variant="muted" className="mb-1">
                    {userInfo.designation}
                  </Typography>
                )}
                {userInfo?.organizationName && (
                  <Typography variant="muted" className="mb-4">
                    {userInfo.organizationName}
                  </Typography>
                )}
                {data?.message?.provider_count && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <Info className="w-4 h-4" />
                    <span>{data.message.provider_count} provider{data.message.provider_count !== 1 ? 's' : ''} available</span>
                  </div>
                )}
                
                {/* Provider List */}
                {data?.message?.providers && data.message.providers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Available Providers:
                    </h4>
                    {data.message.providers.map((provider: any) => (
                      <div key={provider.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {provider.name}
                        </div>
                        {provider.services && provider.services.length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Services: {provider.services.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <SocialProfiles profiles={userInfo?.socialProfiles || []} />
              </div>
            </div>
          </div>

          {/* Service List (when no specific service selected) */}
          {showServiceList ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <Typography variant="h3" className="mb-6">
                Select a Service
              </Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.message?.services?.map((service: any) => (
                  <div
                    key={service.slug}
                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors relative"
                    onClick={() => navigate(service.url)}
                  >
                    {service.type === "individual" && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          Individual
                        </span>
                      </div>
                    )}
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      {service.name}
                    </h4>
                    {service.provider_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Provider: {service.provider_name}
                      </p>
                    )}
                    {service.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{service.duration} min</span>
                      {service.price > 0 && (
                        <span>{service.price} ETB</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : showSelectionScreen ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <Typography variant="h3" className="mb-6">
                Select Appointment Type
              </Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetingDurationCards.map((duration) => (
                  <MeetingCard
                    key={duration.id}
                    duration={duration}
                    onClick={() => {
                      updateTypeQuery(duration.id);
                      setResolvedType(duration.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : selectedDuration ? (
            <Booking
              type={selectedDuration.id}
              duration={selectedDuration}
              isOrganization={true}
              organizationId={data?.message?.organization_id}
              serviceId={data?.message?.service_id}
            />
          ) : null}

          {/* Info Tooltip */}
          {data?.message?.provider_count && data.message.provider_count > 1 && (
            <div className="mt-6 mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">Multiple Providers Available</p>
                  <p>
                    This organization has {data.message.provider_count} providers. 
                    Available time slots will be distributed across all providers using round-robin assignment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8">
          <PoweredBy />
        </div>
      </div>
    </>
  );
};

export default OrganizationAppointment;

