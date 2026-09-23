/**
 * ServiceSelector - Phase 1: Discover
 * Beautiful service/provider selection for organizations
 * Premium Design System with glass-morphism and animations
 */

import { useState } from "react";
import { motion } from "framer-motion";
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl backdrop-blur-sm p-6 md:p-8"
        style={{ 
          backgroundColor: 'var(--border-subtle)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 relative"
          >
            <div 
              className="absolute inset-0 rounded-xl blur-md opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />
            <Avatar className="relative h-20 w-20 md:h-24 md:w-24 rounded-xl ring-2"
              style={{ ringColor: 'var(--accent-primary)' }}
            >
              <AvatarImage src={organization.logo} alt={organization.name} />
              <AvatarFallback className="text-2xl bg-gradient-primary text-white rounded-xl">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {organization.name}
            </h1>
            {organization.description && (
              <p className="text-lg mb-3" style={{ color: 'var(--text-secondary)' }}>
                {organization.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="inline-flex p-1.5 rounded-lg bg-gradient-primary">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span>
                  {organization.providers.length} provider
                  {organization.providers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="inline-flex p-1.5 rounded-lg bg-gradient-secondary">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span>
                  {services.length} service{services.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Services Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Select a Service
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Choose the type of appointment you'd like to book
            </p>
          </div>
          
          {/* View Mode Toggle (for organizations with multiple providers) */}
          {organization.providers.length > 1 && organizationServices.length > 0 && (
            <div 
              className="inline-flex rounded-lg p-1 backdrop-blur-sm"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <button
                onClick={() => setViewMode('services')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'services'
                    ? "bg-gradient-primary text-white shadow-sm"
                    : "hover:bg-[var(--border-default)]"
                )}
                style={{ 
                  color: viewMode === 'services' ? 'white' : 'var(--text-secondary)'
                }}
              >
                View by Services
              </button>
              <button
                onClick={() => setViewMode('providers')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'providers'
                    ? "bg-gradient-primary text-white shadow-sm"
                    : "hover:bg-[var(--border-default)]"
                )}
                style={{ 
                  color: viewMode === 'providers' ? 'white' : 'var(--text-secondary)'
                }}
              >
                View by Providers
              </button>
            </div>
          )}
        </div>

        {/* Individual Services */}
        {individualServices.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="inline-flex p-1.5 rounded-lg bg-gradient-primary">
                <User className="h-5 w-5 text-white" />
              </div>
              Individual Appointments
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {individualServices.map((service, index) => (
                <motion.div
                  key={service.slug || service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <ServiceCard
                  service={service}
                  onSelect={onServiceSelect}
                />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Organization Services - Services View */}
        {organizationServices.length > 0 && viewMode === 'services' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="inline-flex p-1.5 rounded-lg bg-gradient-secondary">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              General Services
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizationServices.map((service, index) => (
                <motion.div
                  key={service.slug || service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <ServiceCard
                  service={service}
                  onSelect={onServiceSelect}
                  availableProviders={organization.providers.filter(p => 
                    p.services?.some(ps => ps === service.name)
                  )}
                />
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {/* Organization Services - Provider View */}
        {organizationServices.length > 0 && viewMode === 'providers' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="inline-flex p-1.5 rounded-lg bg-gradient-primary">
                <Users className="h-5 w-5 text-white" />
              </div>
              Services by Provider
            </h3>
            {servicesByProvider.map(({ provider, services: providerServices }, providerIndex) => {
              if (providerServices.length === 0) return null;
              return (
                <motion.div
                  key={`provider-${provider.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + providerIndex * 0.1 }}
                  className="space-y-4"
                >
                  {/* Provider Header */}
                  <div 
                    className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={provider.avatar} alt={provider.name} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {provider.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {provider.name}
                      </h4>
                      {provider.designation && (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {provider.designation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Services for this provider */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providerServices.map((service, serviceIndex) => (
                      <motion.div
                        key={service.slug || service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 + providerIndex * 0.1 + serviceIndex * 0.05 }}
                      >
                        <ServiceCard
                        service={service}
                        onSelect={onServiceSelect}
                        showProviderName={false}
                      />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Group Services */}
        {groupServices.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="inline-flex p-1.5 rounded-lg bg-gradient-success">
                <Users className="h-5 w-5 text-white" />
              </div>
              Group Sessions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupServices.map((service, index) => (
                <motion.div
                  key={service.slug || service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <ServiceCard
                  service={service}
                  onSelect={onServiceSelect}
                />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Providers Section */}
      {organization.providers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-xl p-6 backdrop-blur-sm"
          style={{ 
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-default)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Our Providers
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organization.providers.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              >
                <ProviderCard provider={provider} />
              </motion.div>
            ))}
          </div>
        </motion.div>
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
    <motion.button
      data-qa="booking-service"
      data-qa-service-slug={service.slug}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(service)}
      className={cn(
        "group relative rounded-xl p-6 backdrop-blur-sm transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "text-left w-full"
      )}
      style={{ 
        backgroundColor: 'var(--border-subtle)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Gradient glow on hover - subtle and transparent */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl blur-2xl"
        style={{
          background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
        }}
      />
      <div className="relative">
      {/* Service Type Badge */}
      {service.type === "individual" && service.provider && (
          <div className="absolute top-0 right-0">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gradient-primary text-white">
            <User className="h-3 w-3" />
            <span>Individual</span>
          </div>
        </div>
      )}

      {/* Service Name */}
        <h4 className="text-xl font-semibold mb-2 pr-16" style={{ color: 'var(--text-primary)' }}>
        {service.name}
      </h4>

      {/* Provider Name (for individual services) */}
      {service.provider && showProviderName && (
          <p className="text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <User className="h-3 w-3" style={{ color: 'var(--accent-primary)' }} />
          {service.provider.name}
        </p>
      )}
      
      {/* Available Providers (for organization services) */}
      {availableProviders.length > 0 && (
        <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Available providers:</p>
          <div className="flex -space-x-2">
            {availableProviders.slice(0, 3).map((provider) => (
                <Avatar 
                  key={`avatar-${provider.id}`} 
                  className="h-7 w-7 border-2" 
                  style={{ borderColor: 'var(--bg-primary)' }}
                  title={provider.name}
                >
                <AvatarImage src={provider.avatar} alt={provider.name} />
                  <AvatarFallback className="text-xs bg-gradient-primary text-white">
                  {provider.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {availableProviders.length > 3 && (
                <div 
                  className="h-7 w-7 rounded-full border-2 flex items-center justify-center"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    borderColor: 'var(--bg-primary)'
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  +{availableProviders.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {service.description && (
          <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {service.description}
        </p>
      )}

      {/* Service Details */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span>{service.duration} min</span>
        </div>
        {service.price && service.price > 0 && (
          <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
            <span>
              {service.price} {service.currency || "ETB"}
            </span>
          </div>
        )}
        {service.providerCount && service.providerCount > 1 && (
          <div className="flex items-center gap-1">
              <Users className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span>{service.providerCount} providers</span>
          </div>
        )}
      </div>

      {/* CTA */}
        <div 
          className="flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
          Book Appointment
        </span>
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </div>
    </motion.button>
  );
}

// Provider Card Component (Info Only)
interface ProviderCardProps {
  provider: Provider;
}

function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg p-4 backdrop-blur-sm"
      style={{ 
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)'
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={provider.avatar} alt={provider.name} />
          <AvatarFallback className="bg-gradient-primary text-white">
            {provider.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {provider.name}
          </h4>
          {provider.designation && (
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {provider.designation}
            </p>
          )}
          {provider.services && provider.services.length > 0 && (
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
              {provider.services.length} service{provider.services.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </motion.div>
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

