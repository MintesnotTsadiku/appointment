import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { X, Copy, Check, AlertCircle, Info, Building2, User, Calendar, MapPin, Link as LinkIcon, Settings } from 'lucide-react';
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
    'frappe_appointment.onboarding.get_debug_info',
    undefined,
    'debug-info',
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const debugInfo = data?.message;

  // Debug logging
  if (data) {
    console.log('Debug Panel - Full API Response:', data);
    console.log('Debug Panel - Message:', data.message);
    console.log('Debug Panel - Summary:', data.message?.summary);
  }
  if (error) {
    console.error('Debug Panel - Error:', error);
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (condition: boolean, label: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      condition 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }`}>
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Debug Information Panel</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Complete setup details and status</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => mutate()}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-300">Error loading debug information: {error.message}</p>
                  </div>
                </div>
              )}

              {!isLoading && !error && !debugInfo && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-yellow-800 dark:text-yellow-300">No debug information available. API may not have returned data.</p>
                  </div>
                </div>
              )}

              {!isLoading && !error && debugInfo && !debugInfo.summary && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-300 font-medium">Debug data received but summary is missing</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                        Check browser console for full response. This might indicate an API error.
                      </p>
                      <details className="mt-2">
                        <summary className="text-xs text-yellow-700 dark:text-yellow-400 cursor-pointer">Show raw data</summary>
                        <pre className="text-xs mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded overflow-auto max-h-40">
                          {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              )}

              {debugInfo && (
                <>
                  {/* Summary Section */}
                  {debugInfo.summary && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-indigo-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Quick Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {getStatusBadge(debugInfo.summary?.has_organization || false, 'Organization')}
                        {getStatusBadge(debugInfo.summary?.has_provider || false, 'Provider')}
                        {getStatusBadge(debugInfo.summary?.has_services || false, 'Services')}
                        {getStatusBadge(debugInfo.summary?.has_locations || false, 'Locations')}
                        {getStatusBadge(debugInfo.summary?.has_booking_link || false, 'Booking Link')}
                        {getStatusBadge(debugInfo.summary?.onboarding_complete || false, 'Onboarding Complete')}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Type: {debugInfo.summary?.onboarding_type || 'None'}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Step: {debugInfo.onboarding?.current_step || 1}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* User Info */}
                  {debugInfo.user && (
                    <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        User Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{debugInfo.user.email || 'Not set'}</code>
                            <button
                              onClick={() => copyToClipboard(debugInfo.user.email || '', 'user-email')}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {copiedField === 'user-email' ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Full Name:</span>
                          <span className="text-sm font-medium">{debugInfo.user.full_name || 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Roles:</span>
                          <div className="flex gap-1 flex-wrap">
                            {(debugInfo.user.roles || []).map(role => (
                              <span key={role} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Organizations */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Organizations ({debugInfo.summary?.organizations_count || 0})
                    </h3>
                    {!debugInfo.organizations || debugInfo.organizations.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No organizations found</p>
                    ) : (
                      <div className="space-y-4">
                        {debugInfo.organizations.map(org => (
                          <div key={org.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{org.organization_name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{org.organization_type}</p>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(org.is_active, 'Active')}
                                {getStatusBadge(org.setup_complete, 'Setup Complete')}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Email: </span>
                                <code className="text-xs">{org.email || 'Not set'}</code>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Phone: </span>
                                <span>{org.phone || 'Not set'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Slug: </span>
                                <code className="text-xs">{org.slug || 'Not set'}</code>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">ID: </span>
                                <code className="text-xs">{org.name}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Providers */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Providers ({debugInfo.summary?.providers_count || 0})
                    </h3>
                    {!debugInfo.providers || debugInfo.providers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No providers found</p>
                    ) : (
                      <div className="space-y-4">
                        {debugInfo.providers.map(provider => (
                          <div key={provider.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{provider.provider_name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{provider.email}</p>
                                {provider.onboarding_type && (
                                  <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                    provider.onboarding_type === 'individual' 
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  }`}>
                                    {provider.onboarding_type === 'individual' ? '👤 Solo Provider' : '🏢 Organization Provider'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(provider.is_active, 'Active')}
                                {getStatusBadge(provider.onboarding_complete, 'Onboarding')}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Type: </span>
                                <span>{provider.onboarding_type || 'Not set'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Phone: </span>
                                <span>{provider.phone || 'Not set'}</span>
                              </div>
                              {provider.organizations && provider.organizations.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-gray-600 dark:text-gray-400">Organizations: </span>
                                  <div className="flex gap-2 mt-1">
                                    {provider.organizations.map(org => (
                                      <span key={org.name} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded">
                                        {org.organization_name} {org.is_primary && '(Primary)'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {provider.locations && provider.locations.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-gray-600 dark:text-gray-400">Locations: </span>
                                  <div className="flex gap-2 mt-1">
                                    {provider.locations.map(loc => (
                                      <span key={loc.name} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                                        {loc.location_name} {loc.organization && `(${loc.organization})`}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Services */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Services ({debugInfo.summary?.services_count || 0})
                    </h3>
                    {!debugInfo.services || debugInfo.services.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No services found</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.services.map(service => (
                          <div key={service.name} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div>
                              <span className="font-medium text-sm">{service.service_name}</span>
                              <span className="text-xs text-gray-500 ml-2">{service.duration} min • {service.price} ETB</span>
                            </div>
                            {getStatusBadge(service.is_active, 'Active')}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Locations */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Locations ({debugInfo.summary?.locations_count || 0})
                    </h3>
                    {!debugInfo.locations || debugInfo.locations.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No locations found</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.locations.map(location => (
                          <div key={location.name} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div>
                              <span className="font-medium text-sm">{location.location_name}</span>
                              {location.organization && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 ml-2">(Org Branch)</span>
                              )}
                              {!location.organization && (
                                <span className="text-xs text-gray-500 ml-2">(Personal)</span>
                              )}
                            </div>
                            {getStatusBadge(location.is_active, 'Active')}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Booking Links */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Booking Links ({debugInfo.summary?.booking_links_count || 0})
                    </h3>
                    {!debugInfo.booking_links || debugInfo.booking_links.length === 0 ? (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          ⚠️ No booking link available. Complete your setup to get your booking link.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {debugInfo.booking_links.map(link => (
                          <div key={link.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                {link.provider_name && (
                                  <div className="mb-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Provider: </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{link.provider_name}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-sm">Slug: </span>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{link.slug}</code>
                                </div>
                                {link.user && (
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">User: </span>
                                    <code className="text-xs text-gray-600 dark:text-gray-400">{link.user}</code>
                                  </div>
                                )}
                              </div>
                              {getStatusBadge(link.enable_scheduling, 'Enabled')}
                            </div>
                            {link.booking_url && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">URL: </span>
                                <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                                  {window.location.origin}{link.booking_url}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}${link.booking_url}`, `link-${link.name}`)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  {copiedField === `link-${link.name}` ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* EventTypes */}
                  <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Event Types ({debugInfo.summary?.event_types_count || 0})
                    </h3>
                    {!debugInfo.event_types || debugInfo.event_types.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No event types found</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.event_types.map(et => (
                          <div key={et.name} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div>
                              <span className="font-medium text-sm">{et.event_type_name}</span>
                              <span className="text-xs text-gray-500 ml-2">Provider: {et.provider} • Service: {et.service}</span>
                            </div>
                            {getStatusBadge(et.is_active, 'Active')}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Appointments */}
                  {debugInfo.appointments && debugInfo.appointments.length > 0 && (
                    <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Recent Appointments ({debugInfo.summary?.appointments_count || 0})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {debugInfo.appointments.map(apt => (
                          <div key={apt.name} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div>
                              <span className="font-medium text-sm">{apt.appointment_id}</span>
                              <span className="text-xs text-gray-500 ml-2">{apt.client_name} • {apt.appointment_date}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              apt.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              apt.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default DebugPanel;

