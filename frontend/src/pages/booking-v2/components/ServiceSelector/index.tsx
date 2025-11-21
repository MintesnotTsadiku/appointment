/**
 * ServiceSelector - Phase 1: Discover
 * Beautiful service/provider selection for organizations
 */

import { useState } from "react";
import { Clock, User, Users, DollarSign, ChevronRight, Building2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import type { Service, Organization, Provider } from "../../types";

interface ServiceSelectorProps {
  organization: Organization;
  services: Service[];
  onServiceSelect: (service: Service) => void;
  loading?: boolean;
  className?: string;
}

export function ServiceSelector({
  organization,
  services,
  onServiceSelect,
  loading = false,
  className,
}: ServiceSelectorProps) {
  const [viewMode, setViewMode] = useState<'services' | 'providers'>('services');
  
  if (loading) {
    return <ServiceSelectorLoading />;
  }

  // Group services by type
  const individualServices = services.filter((s) => s.type === "individual");
  const organizationServices = services.filter((s) => s.type === "organization");
  const groupServices = services.filter((s) => s.type === "group");
  
  // Group services by provider for provider view
  const servicesByProvider = organization.providers.map(provider => ({
    provider,
    services: services.filter(s => 
      s.provider?.id === provider.id || 
      (s.type === 'organization' && provider.services?.some(ps => ps === s.name))
    ),
  }));

  return (
    <div className={cn("w-full max-w-6xl mx-auto space-y-8", className)}>
      {/* Organization Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 rounded-xl">
              <AvatarImage src={organization.logo} alt={organization.name} />
              <AvatarFallback className="text-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {organization.name}
            </h1>
            {organization.description && (
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-3">
                {organization.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>
                  {organization.providers.length} provider
                  {organization.providers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building2 className="h-4 w-4" />
                <span>
                  {services.length} service{services.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Select a Service
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose the type of appointment you'd like to book
            </p>
          </div>
          
          {/* View Mode Toggle (for organizations with multiple providers) */}
          {organization.providers.length > 1 && organizationServices.length > 0 && (
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('services')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'services'
                    ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                View by Services
              </button>
              <button
                onClick={() => setViewMode('providers')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'providers'
                    ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                View by Providers
              </button>
            </div>
          )}
        </div>

        {/* Individual Services */}
        {individualServices.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Individual Appointments
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {individualServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={onServiceSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Organization Services - Services View */}
        {organizationServices.length > 0 && viewMode === 'services' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              General Services
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizationServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={onServiceSelect}
                  availableProviders={organization.providers.filter(p => 
                    p.services?.some(ps => ps === service.name)
                  )}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Organization Services - Provider View */}
        {organizationServices.length > 0 && viewMode === 'providers' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Services by Provider
            </h3>
            {servicesByProvider.map(({ provider, services: providerServices }) => {
              if (providerServices.length === 0) return null;
              return (
                <div key={`provider-${provider.id}`} className="space-y-4">
                  {/* Provider Header */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={provider.avatar} alt={provider.name} />
                      <AvatarFallback className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        {provider.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {provider.name}
                      </h4>
                      {provider.designation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {provider.designation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Services for this provider */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providerServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onSelect={onServiceSelect}
                        showProviderName={false}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Group Services */}
        {groupServices.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Group Sessions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={onServiceSelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Providers Section */}
      {organization.providers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Our Providers
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organization.providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Service Card Component
interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  availableProviders?: Provider[];
  showProviderName?: boolean;
}

function ServiceCard({ service, onSelect, availableProviders = [], showProviderName = true }: ServiceCardProps) {
  return (
    <button
      onClick={() => onSelect(service)}
      className={cn(
        "group relative bg-white dark:bg-gray-800 rounded-xl p-6",
        "border-2 border-gray-200 dark:border-gray-700",
        "hover:border-primary-400 dark:hover:border-primary-500",
        "hover:shadow-lg transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        "text-left w-full",
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      {/* Service Type Badge */}
      {service.type === "individual" && service.provider && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            <User className="h-3 w-3" />
            <span>Individual</span>
          </div>
        </div>
      )}

      {/* Service Name */}
      <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 pr-16">
        {service.name}
      </h4>

      {/* Provider Name (for individual services) */}
      {service.provider && showProviderName && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
          <User className="h-3 w-3" />
          {service.provider.name}
        </p>
      )}
      
      {/* Available Providers (for organization services) */}
      {availableProviders.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Available providers:</p>
          <div className="flex -space-x-2">
            {availableProviders.slice(0, 3).map((provider) => (
              <Avatar key={`avatar-${provider.id}`} className="h-7 w-7 border-2 border-white dark:border-gray-800" title={provider.name}>
                <AvatarImage src={provider.avatar} alt={provider.name} />
                <AvatarFallback className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {provider.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {availableProviders.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  +{availableProviders.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {service.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {service.description}
        </p>
      )}

      {/* Service Details */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{service.duration} min</span>
        </div>
        {service.price && service.price > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>
              {service.price} {service.currency || "ETB"}
            </span>
          </div>
        )}
        {service.providerCount && service.providerCount > 1 && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{service.providerCount} providers</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
          Book Appointment
        </span>
        <ChevronRight className="h-5 w-5 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}

// Provider Card Component (Info Only)
interface ProviderCardProps {
  provider: Provider;
}

function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={provider.avatar} alt={provider.name} />
          <AvatarFallback className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            {provider.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {provider.name}
          </h4>
          {provider.designation && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {provider.designation}
            </p>
          )}
          {provider.services && provider.services.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
              {provider.services.length} service{provider.services.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function ServiceSelectorLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Services Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

