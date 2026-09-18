import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { 
  X, 
  Copy, 
  Check, 
  AlertCircle, 
  Info, 
  Building2, 
  User, 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Settings,
  RefreshCw,
  Bug,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DebugInfo {
  user: {
    email: string;
    full_name: string;
    roles: string[];
  };
  organizations: Array<{
    name: string;
    organization_name: string;
    organization_type: string;
    email: string;
    phone: string;
    slug: string;
    is_active: boolean;
    setup_complete: boolean;
    logo?: string;
  }>;
  providers: Array<{
    name: string;
    provider_name: string;
    email: string;
    phone: string;
    organization?: string;
    organizations?: Array<{
      name: string;
      organization_name: string;
      status: string;
      accept_org_bookings: boolean;
      is_primary: boolean;
    }>;
    locations?: Array<{
      name: string;
      location_name: string;
      organization?: string;
      is_primary: boolean;
    }>;
    onboarding_complete: boolean;
    onboarding_type: string;
    is_active: boolean;
  }>;
  services: Array<{
    name: string;
    service_name: string;
    duration: number;
    price: number;
    service_type: string;
    is_active: boolean;
  }>;
  locations: Array<{
    name: string;
    location_name: string;
    organization?: string;
    address_line_1?: string;
    city?: string;
    is_active: boolean;
  }>;
  event_types: Array<{
    name: string;
    event_type_name: string;
    service: string;
    provider: string;
    location: string;
    is_active: boolean;
  }>;
  booking_links: Array<{
    name: string;
    slug: string;
    user: string;
    meeting_provider: string;
    enable_scheduling: boolean;
    booking_url?: string;
    provider_name?: string;
  }>;
  appointments: Array<{
    name: string;
    appointment_id: string;
    provider: string;
    service: string;
    location: string;
    status: string;
    appointment_date: string;
    client_name: string;
  }>;
  onboarding: {
    onboarding_complete: boolean;
    onboarding_type: string;
    current_step: number;
    completed_steps: number[];
  };
  summary: {
    organizations_count: number;
    providers_count: number;
    services_count: number;
    locations_count: number;
    event_types_count: number;
    booking_links_count: number;
    appointments_count: number;
    onboarding_complete: boolean;
    onboarding_type: string;
    has_organization: boolean;
    has_provider: boolean;
    has_booking_link: boolean;
    has_services: boolean;
    has_locations: boolean;
  };
}

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel = ({ isOpen, onClose }: DebugPanelProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: DebugInfo }>(
    'appointment.onboarding.get_debug_info',
    undefined,
    'debug-info',
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const debugInfo = data?.message;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (condition: boolean, label: string) => (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: condition ? 'var(--accent-success-light)' : 'var(--status-cancelled-bg)',
        color: condition ? 'var(--accent-success)' : 'var(--status-cancelled)'
      }}
    >
      {condition ? '✓' : '✗'} {label}
    </span>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-default)'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-6"
              style={{ 
                background: 'linear-gradient(to right, var(--border-subtle), var(--bg-secondary))',
                borderBottom: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-primary">
                  <Bug className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Debug Information
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Complete setup details and status
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => mutate()}
                  className="p-2.5 rounded-xl transition-colors"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2.5 rounded-xl transition-colors"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-2"
                    style={{ 
                      borderColor: 'var(--border-default)',
                      borderTopColor: 'var(--accent-primary)'
                    }}
                  />
                </div>
              )}

              {error && (
                <div 
                  className="rounded-xl p-4"
                  style={{ 
                    backgroundColor: 'var(--status-cancelled-bg)',
                    border: '1px solid var(--status-cancelled)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" style={{ color: 'var(--status-cancelled)' }} />
                    <p style={{ color: 'var(--status-cancelled)' }}>
                      Error loading debug information: {error.message}
                    </p>
                  </div>
                </div>
              )}

              {!isLoading && !error && !debugInfo && (
                <div 
                  className="rounded-xl p-4"
                  style={{ 
                    backgroundColor: 'var(--accent-warning-light)',
                    border: '1px solid var(--accent-warning)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent-warning)' }} />
                    <p style={{ color: 'var(--accent-warning)' }}>
                      No debug information available.
                    </p>
                  </div>
                </div>
              )}

              {debugInfo && (
                <>
                  {/* Summary Section */}
                  {debugInfo.summary && (
                    <div 
                      className="rounded-2xl p-6"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--accent-primary-light), var(--border-subtle))',
                        border: '1px solid var(--accent-primary-light)'
                      }}
                    >
                      <h3 
                        className="text-lg font-semibold mb-4 flex items-center gap-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        Quick Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {getStatusBadge(debugInfo.summary?.has_organization || false, 'Organization')}
                        {getStatusBadge(debugInfo.summary?.has_provider || false, 'Provider')}
                        {getStatusBadge(debugInfo.summary?.has_services || false, 'Services')}
                        {getStatusBadge(debugInfo.summary?.has_locations || false, 'Locations')}
                        {getStatusBadge(debugInfo.summary?.has_booking_link || false, 'Booking Link')}
                        {getStatusBadge(debugInfo.summary?.onboarding_complete || false, 'Onboarding')}
                        <span 
                          className="text-sm px-2.5 py-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Type: {debugInfo.summary?.onboarding_type || 'None'}
                        </span>
                        <span 
                          className="text-sm px-2.5 py-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Step: {debugInfo.onboarding?.current_step || 1}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* User Info */}
                  {debugInfo.user && (
                    <Section title="User Information" icon={User}>
                      <div className="space-y-3">
                        <InfoRow 
                          label="Email" 
                          value={debugInfo.user.email || 'Not set'}
                          copyable
                          copiedField={copiedField}
                          onCopy={() => copyToClipboard(debugInfo.user.email || '', 'user-email')}
                          fieldId="user-email"
                        />
                        <InfoRow label="Full Name" value={debugInfo.user.full_name || 'Not set'} />
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Roles:</span>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {(debugInfo.user.roles || []).map(role => (
                              <span 
                                key={role} 
                                className="text-xs px-2 py-1 rounded-full"
                                style={{ 
                                  backgroundColor: 'var(--accent-primary-light)',
                                  color: 'var(--accent-primary)'
                                }}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Organizations */}
                  <Section 
                    title={`Organizations (${debugInfo.summary?.organizations_count || 0})`} 
                    icon={Building2}
                  >
                    {!debugInfo.organizations || debugInfo.organizations.length === 0 ? (
                      <EmptyState message="No organizations found" />
                    ) : (
                      <div className="space-y-4">
                        {debugInfo.organizations.map(org => (
                          <ItemCard key={org.name}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {org.organization_name}
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {org.organization_type}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(org.is_active, 'Active')}
                                {getStatusBadge(org.setup_complete, 'Setup')}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <InfoRow label="Email" value={org.email || 'Not set'} compact />
                              <InfoRow label="Phone" value={org.phone || 'Not set'} compact />
                              <InfoRow label="Slug" value={org.slug || 'Not set'} compact code />
                              <InfoRow label="ID" value={org.name} compact code />
                            </div>
                          </ItemCard>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Providers */}
                  <Section 
                    title={`Providers (${debugInfo.summary?.providers_count || 0})`} 
                    icon={User}
                  >
                    {!debugInfo.providers || debugInfo.providers.length === 0 ? (
                      <EmptyState message="No providers found" />
                    ) : (
                      <div className="space-y-4">
                        {debugInfo.providers.map(provider => (
                          <ItemCard key={provider.name}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {provider.provider_name}
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {provider.email}
                                </p>
                                {provider.onboarding_type && (
                                  <span 
                                    className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                                    style={{ 
                                      backgroundColor: provider.onboarding_type === 'individual' 
                                        ? 'var(--accent-primary-light)' 
                                        : 'var(--status-pending-bg)',
                                      color: provider.onboarding_type === 'individual' 
                                        ? 'var(--accent-primary)' 
                                        : 'var(--status-pending)'
                                    }}
                                  >
                                    {provider.onboarding_type === 'individual' ? '👤 Solo' : '🏢 Organization'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(provider.is_active, 'Active')}
                                {getStatusBadge(provider.onboarding_complete, 'Onboarding')}
                              </div>
                            </div>
                          </ItemCard>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Services */}
                  <Section 
                    title={`Services (${debugInfo.summary?.services_count || 0})`} 
                    icon={Calendar}
                  >
                    {!debugInfo.services || debugInfo.services.length === 0 ? (
                      <EmptyState message="No services found" />
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.services.map(service => (
                          <div 
                            key={service.name} 
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{ 
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div>
                              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {service.service_name}
                              </span>
                              <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                                {service.duration} min • {service.price} ETB
                              </span>
                            </div>
                            {getStatusBadge(service.is_active, 'Active')}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Locations */}
                  <Section 
                    title={`Locations (${debugInfo.summary?.locations_count || 0})`} 
                    icon={MapPin}
                  >
                    {!debugInfo.locations || debugInfo.locations.length === 0 ? (
                      <EmptyState message="No locations found" />
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.locations.map(location => (
                          <div 
                            key={location.name} 
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{ 
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div>
                              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {location.location_name}
                              </span>
                              <span 
                                className="text-xs ml-2"
                                style={{ color: location.organization ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                              >
                                {location.organization ? '(Org Branch)' : '(Personal)'}
                              </span>
                            </div>
                            {getStatusBadge(location.is_active, 'Active')}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Booking Links */}
                  <Section 
                    title={`Booking Links (${debugInfo.summary?.booking_links_count || 0})`} 
                    icon={LinkIcon}
                  >
                    {!debugInfo.booking_links || debugInfo.booking_links.length === 0 ? (
                      <div 
                        className="rounded-xl p-4"
                        style={{ 
                          backgroundColor: 'var(--accent-warning-light)',
                          border: '1px solid var(--accent-warning)'
                        }}
                      >
                        <p className="text-sm" style={{ color: 'var(--accent-warning)' }}>
                          ⚠️ No booking link available. Complete your setup to get your booking link.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {debugInfo.booking_links.map(link => (
                          <ItemCard key={link.name}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                {link.provider_name && (
                                  <div className="mb-1">
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      Provider:{' '}
                                    </span>
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {link.provider_name}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Slug:{' '}
                                  </span>
                                  <code 
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ backgroundColor: 'var(--border-default)' }}
                                  >
                                    {link.slug}
                                  </code>
                                </div>
                              </div>
                              {getStatusBadge(link.enable_scheduling, 'Enabled')}
                            </div>
                            {link.booking_url && (
                              <div className="flex items-center gap-2 mt-3">
                                <code 
                                  className="flex-1 text-xs px-3 py-2 rounded-lg break-all"
                                  style={{ backgroundColor: 'var(--border-default)' }}
                                >
                                  {window.location.origin}{link.booking_url}
                                </code>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => copyToClipboard(`${window.location.origin}${link.booking_url}`, `link-${link.name}`)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ 
                                    backgroundColor: 'var(--accent-primary-light)',
                                    color: 'var(--accent-primary)'
                                  }}
                                >
                                  {copiedField === `link-${link.name}` ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </motion.button>
                              </div>
                            )}
                          </ItemCard>
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              )}
            </div>

            {/* Footer */}
            <div 
              className="p-4 flex items-center justify-between"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-default)'
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Last updated: {new Date().toLocaleTimeString()}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-primary"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

// Helper Components
interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const Section = ({ title, icon: Icon, children }: SectionProps) => (
  <section 
    className="rounded-2xl p-6"
    style={{ 
      backgroundColor: 'var(--border-subtle)',
      border: '1px solid var(--border-default)'
    }}
  >
    <h3 
      className="text-lg font-semibold mb-4 flex items-center gap-2"
      style={{ color: 'var(--text-primary)' }}
    >
      <Icon className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
      {title}
    </h3>
    {children}
  </section>
);

const ItemCard = ({ children }: { children: React.ReactNode }) => (
  <div 
    className="rounded-xl p-4"
    style={{ 
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)'
    }}
  >
    {children}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
);

interface InfoRowProps {
  label: string;
  value: string;
  compact?: boolean;
  code?: boolean;
  copyable?: boolean;
  copiedField?: string | null;
  onCopy?: () => void;
  fieldId?: string;
}

const InfoRow = ({ label, value, compact, code, copyable, copiedField, onCopy, fieldId }: InfoRowProps) => (
  <div className={`flex items-center justify-between ${compact ? '' : 'py-1'}`}>
    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}:</span>
    <div className="flex items-center gap-2">
      {code ? (
        <code 
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          {value}
        </code>
      ) : (
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
      )}
      {copyable && onCopy && (
        <button
          onClick={onCopy}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {copiedField === fieldId ? (
            <Check className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  </div>
);

export default DebugPanel;
