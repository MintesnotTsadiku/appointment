/**
 * Provider Hierarchy Tree Component
 * Shows Provider → Organizations → Locations → Services → EventTypes
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, MapPin, User, Calendar, Link as LinkIcon, AlertTriangle, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/button';
import { ValidationBadge } from './ValidationBadge';
import { ItemCard } from './ItemCard';
import { CreateItemModal } from './CreateItemModal';
import { EditItemModal } from './EditItemModal';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';

interface ProviderHierarchyTreeProps {
  providers: Array<{
    name: string;
    provider_name: string;
    email?: string;
    phone?: string;
    validation: any;
    booking_urls?: Array<{
      url_type: string;
      slug: string;
      full_url: string;
      description?: string;
    }>;
    organizations: Array<{
      name: string;
      organization_name: string;
      slug: string;
      is_primary?: boolean;
      locations: Array<{
        name: string;
        location_name: string;
        address?: string;
        services: Array<{
          name: string;
          service_name: string;
          event_types: any[];
        }>;
      }>;
    }>;
  }>;
  onRefresh: () => void;
}

export const ProviderHierarchyTree = ({ providers, onRefresh }: ProviderHierarchyTreeProps) => {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<any>(null);
  const [createItem, setCreateItem] = useState<{ type: string; context?: any } | null>(null);
  const { call: deleteEventType } = useFrappePostCall('appointment.api.manage.delete_event_type');

  const toggleProvider = (providerName: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerName)) {
      newExpanded.delete(providerName);
    } else {
      newExpanded.add(providerName);
    }
    setExpandedProviders(newExpanded);
  };

  const toggleOrg = (orgKey: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgKey)) {
      newExpanded.delete(orgKey);
    } else {
      newExpanded.add(orgKey);
    }
    setExpandedOrgs(newExpanded);
  };

  const toggleLocation = (locationKey: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationKey)) {
      newExpanded.delete(locationKey);
    } else {
      newExpanded.add(locationKey);
    }
    setExpandedLocations(newExpanded);
  };

  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      if (type === 'event_type') {
        await deleteEventType({ event_type_id: id });
      } else {
        toast.error('Delete not supported for this item type');
        return;
      }
      
      toast.success(`${name} deleted successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete item');
    }
  };

  if (!providers || providers.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No providers found in your organizations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {providers.map((provider) => {
        const isProviderExpanded = expandedProviders.has(provider.name);
        
        return (
          <div key={provider.name} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Provider Header */}
            <button
              onClick={() => toggleProvider(provider.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isProviderExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {provider.provider_name}
                </span>
                <ValidationBadge status={provider.validation?.status || 'complete'} />
                {provider.organizations?.some(org => org.is_primary) && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    Primary
                  </span>
                )}
              </div>
            </button>

            {/* Provider Validation Issues */}
            {provider.validation && provider.validation.issues && provider.validation.issues.length > 0 && (
              <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Issues found:
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                        {provider.validation.issues.map((issue: string, idx: number) => {
                          // Determine what action to take based on the issue
                          const getFixAction = (issueText: string) => {
                            if (issueText.toLowerCase().includes('no eventtypes') || issueText.toLowerCase().includes('no event types')) {
                              return {
                                label: 'Create EventType',
                                action: () => {
                                  // Find first organization to create EventType in
                                  const firstOrg = provider.organizations?.[0];
                                  if (firstOrg) {
                                    setCreateItem({ 
                                      type: 'event_type',
                                      context: {
                                        provider: provider.name,
                                        organization: firstOrg.name
                                      }
                                    });
                                  }
                                }
                              };
                            }
                            if (issueText.toLowerCase().includes('no availability') || issueText.toLowerCase().includes('availability')) {
                              return {
                                label: 'Set Availability',
                                action: () => {
                                  toast.info('Please set availability in the provider settings');
                                }
                              };
                            }
                            return null;
                          };

                          const fixAction = getFixAction(issue);
                          
                          return (
                            <li key={idx} className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 flex-1">
                                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                                <span>{issue}</span>
                              </div>
                              {fixAction && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={fixAction.action}
                                  className="flex-shrink-0 text-xs h-7"
                                >
                                  <Wrench className="w-3 h-3 mr-1" />
                                  {fixAction.label}
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Booking URLs */}
            {provider.booking_urls && provider.booking_urls.length > 0 && (
              <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking URLs:</span>
                </div>
                <div className="space-y-1">
                  {provider.booking_urls.map((url: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <a
                        href={url.full_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {url.description || url.url_type || url.full_url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Organizations */}
            {isProviderExpanded && provider.organizations && provider.organizations.length > 0 && (
              <div className="px-4 pb-4 space-y-3">
                {provider.organizations.map((org) => {
                  const orgKey = `${provider.name}-${org.name}`;
                  const isOrgExpanded = expandedOrgs.has(orgKey);
                  
                  return (
                    <div key={org.name} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                      {/* Organization Header */}
                      <button
                        onClick={() => toggleOrg(orgKey)}
                        className="w-full flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 -ml-2"
                      >
                        <div className="flex items-center gap-2">
                          {isOrgExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {org.organization_name}
                          </span>
                          {org.is_primary && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Organization Locations */}
                      {isOrgExpanded && org.locations && org.locations.length > 0 && (
                        <div className="ml-4 mt-2 space-y-2">
                          {org.locations.map((location) => {
                            const locationKey = `${orgKey}-${location.name}`;
                            const isLocationExpanded = expandedLocations.has(locationKey);
                            
                            return (
                              <div key={location.name} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                {/* Location Header */}
                                <button
                                  onClick={() => toggleLocation(locationKey)}
                                  className="w-full flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 -ml-2"
                                >
                                  <div className="flex items-center gap-2">
                                    {isLocationExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {location.location_name}
                                    </span>
                                    {location.validation && (
                                      <ValidationBadge status={location.validation.status || 'complete'} />
                                    )}
                                  </div>
                                </button>

                                {/* Location Validation Issues */}
                                {isLocationExpanded && location.validation && location.validation.issues && location.validation.issues.length > 0 && (
                                  <div className="ml-4 mt-2 mb-2">
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                                      <div className="flex items-start space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                            Location Issues:
                                          </p>
                                          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                                            {location.validation.issues.map((issue: string, idx: number) => {
                                              const getFixAction = (issueText: string) => {
                                                if (issueText.toLowerCase().includes('missing address') || issueText.toLowerCase().includes('no address')) {
                                                  return {
                                                    label: 'Edit Location',
                                                    action: () => {
                                                      // Find location in providers to get full data
                                                      const locationData = org.locations.find(l => l.name === location.name);
                                                      if (locationData) {
                                                        setEditItem({ 
                                                          type: 'location', 
                                                          name: location.name,
                                                          location_name: location.location_name,
                                                          address_line_1: location.address_line_1,
                                                          address_line_2: location.address_line_2,
                                                          city: location.city,
                                                          phone: location.phone,
                                                          timezone: location.timezone
                                                        });
                                                      }
                                                    }
                                                  };
                                                }
                                                if (issueText.toLowerCase().includes('timezone')) {
                                                  return {
                                                    label: 'Edit Location',
                                                    action: () => {
                                                      const locationData = org.locations.find(l => l.name === location.name);
                                                      if (locationData) {
                                                        setEditItem({ 
                                                          type: 'location', 
                                                          name: location.name,
                                                          location_name: location.location_name,
                                                          address_line_1: location.address_line_1,
                                                          address_line_2: location.address_line_2,
                                                          city: location.city,
                                                          phone: location.phone,
                                                          timezone: location.timezone
                                                        });
                                                      }
                                                    }
                                                  };
                                                }
                                                return {
                                                  label: 'Fix',
                                                  action: () => {
                                                    const locationData = org.locations.find(l => l.name === location.name);
                                                    if (locationData) {
                                                      setEditItem({ 
                                                        type: 'location', 
                                                        name: location.name,
                                                        location_name: location.location_name,
                                                        address_line_1: location.address_line_1,
                                                        address_line_2: location.address_line_2,
                                                        city: location.city,
                                                        phone: location.phone,
                                                        timezone: location.timezone
                                                      });
                                                    }
                                                  }
                                                };
                                              };

                                              const fixAction = getFixAction(issue);
                                              
                                              return (
                                                <li key={idx} className="flex items-center justify-between gap-2">
                                                  <span>• {issue}</span>
                                                  {fixAction && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={fixAction.action}
                                                      className="flex-shrink-0 text-xs h-6 px-2"
                                                    >
                                                      <Wrench className="w-3 h-3 mr-1" />
                                                      {fixAction.label}
                                                    </Button>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Location Services */}
                                {isLocationExpanded && location.services && location.services.length > 0 && (
                                  <div className="ml-4 mt-2 space-y-2">
                                    {location.services.map((service) => (
                                      <div key={service.name} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                        <ItemCard
                                          type="service"
                                          item={{
                                            ...service,
                                            type: 'service'
                                          }}
                                          onEdit={() => setEditItem({ type: 'service', ...service })}
                                          onDelete={() => {}}
                                          onRefresh={onRefresh}
                                          nested
                                        />
                                        
                                        {/* Service Validation Issues */}
                                        {service.validation && service.validation.issues && service.validation.issues.length > 0 && (
                                          <div className="ml-4 mt-2 mb-2">
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                                              <div className="flex items-start space-x-2">
                                                <AlertTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                                    Service Issues:
                                                  </p>
                                                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                                                    {service.validation.issues.map((issue: string, idx: number) => {
                                                      const getFixAction = (issueText: string) => {
                                                        if (issueText.toLowerCase().includes('no providers') || issueText.toLowerCase().includes('no provider')) {
                                                          return {
                                                            label: 'Link Provider',
                                                            action: () => {
                                                              toast.info('Use the Edit button to link providers to this service');
                                                              setEditItem({ type: 'service', ...service });
                                                            }
                                                          };
                                                        }
                                                        if (issueText.toLowerCase().includes('no eventtypes') || issueText.toLowerCase().includes('no event types')) {
                                                          return {
                                                            label: 'Create EventType',
                                                            action: () => {
                                                              setCreateItem({ 
                                                                type: 'event_type',
                                                                context: {
                                                                  service: service.name,
                                                                  provider: provider.name,
                                                                  organization: org.name,
                                                                  location: location.name
                                                                }
                                                              });
                                                            }
                                                          };
                                                        }
                                                        return null;
                                                      };

                                                      const fixAction = getFixAction(issue);
                                                      
                                                      return (
                                                        <li key={idx} className="flex items-center justify-between gap-2">
                                                          <span>• {issue}</span>
                                                          {fixAction && (
                                                            <Button
                                                              size="sm"
                                                              variant="outline"
                                                              onClick={fixAction.action}
                                                              className="flex-shrink-0 text-xs h-6 px-2"
                                                            >
                                                              <Wrench className="w-3 h-3 mr-1" />
                                                              {fixAction.label}
                                                            </Button>
                                                          )}
                                                        </li>
                                                      );
                                                    })}
                                                  </ul>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Service EventTypes */}
                                        {service.event_types && service.event_types.length > 0 && (
                                          <div className="ml-4 mt-2 space-y-2">
                                            {service.event_types.map((et: any) => (
                                              <div key={et.name}>
                                                <ItemCard
                                                  type="event_type"
                                                  item={{
                                                    ...et,
                                                    type: 'event_type'
                                                  }}
                                                  onEdit={() => setEditItem({ type: 'event_type', ...et })}
                                                  onDelete={() => handleDelete('event_type', et.name, et.event_type_name)}
                                                  onRefresh={onRefresh}
                                                  nested
                                                />
                                                
                                                {/* EventType Validation Issues */}
                                                {et.validation && et.validation.issues && et.validation.issues.length > 0 && (
                                                  <div className="ml-4 mt-1 mb-2">
                                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                                                      <div className="flex items-start space-x-2">
                                                        <AlertTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                                            EventType Issues:
                                                          </p>
                                                          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                                                            {et.validation.issues.map((issue: string, idx: number) => {
                                                              const getFixAction = (issueText: string) => {
                                                                if (issueText.toLowerCase().includes('no availability') || issueText.toLowerCase().includes('availability')) {
                                                                  return {
                                                                    label: 'Set Availability',
                                                                    action: () => {
                                                                      toast.info('Please set provider availability in settings');
                                                                    }
                                                                  };
                                                                }
                                                                if (issueText.toLowerCase().includes('missing location') || issueText.toLowerCase().includes('no location')) {
                                                                  return {
                                                                    label: 'Edit EventType',
                                                                    action: () => {
                                                                      setEditItem({ type: 'event_type', ...et });
                                                                    }
                                                                  };
                                                                }
                                                                if (issueText.toLowerCase().includes('missing provider') || issueText.toLowerCase().includes('no provider')) {
                                                                  return {
                                                                    label: 'Edit EventType',
                                                                    action: () => {
                                                                      setEditItem({ type: 'event_type', ...et });
                                                                    }
                                                                  };
                                                                }
                                                                return {
                                                                  label: 'Fix',
                                                                  action: () => {
                                                                    setEditItem({ type: 'event_type', ...et });
                                                                  }
                                                                };
                                                              };

                                                              const fixAction = getFixAction(issue);
                                                              
                                                              return (
                                                                <li key={idx} className="flex items-center justify-between gap-2">
                                                                  <span>• {issue}</span>
                                                                  {fixAction && (
                                                                    <Button
                                                                      size="sm"
                                                                      variant="outline"
                                                                      onClick={fixAction.action}
                                                                      className="flex-shrink-0 text-xs h-6 px-2"
                                                                    >
                                                                      <Wrench className="w-3 h-3 mr-1" />
                                                                      {fixAction.label}
                                                                    </Button>
                                                                  )}
                                                                </li>
                                                              );
                                                            })}
                                                          </ul>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Create Modal */}
      {createItem && (
        <CreateItemModal
          isOpen={!!createItem}
          onClose={() => setCreateItem(null)}
          type={createItem.type as 'service' | 'location' | 'event_type'}
          organizationId={createItem.context?.organization}
          context={createItem.context}
          organization={(() => {
            // Build organization data for dropdowns
            if (!createItem.context) return undefined;
            
            const provider = providers.find(p => p.name === createItem.context.provider);
            if (!provider) return undefined;
            
            const org = provider.organizations.find(o => o.name === createItem.context.organization);
            if (!org) return undefined;
            
            // Collect all services, providers, and locations
            const allServices = new Set<string>();
            const allLocations = new Set<string>();
            
            org.locations.forEach(loc => {
              allLocations.add(loc.name);
              loc.services.forEach(svc => {
                allServices.add(svc.name);
              });
            });
            
            return {
              services: Array.from(allServices).map(svcName => {
                for (const loc of org.locations) {
                  const svc = loc.services.find(s => s.name === svcName);
                  if (svc) return { name: svc.name, service_name: svc.service_name };
                }
                return { name: svcName, service_name: svcName };
              }),
              providers: [{ name: provider.name, provider_name: provider.provider_name }],
              locations: org.locations.map(l => ({
                name: l.name,
                location_name: l.location_name
              }))
            };
          })()}
          onSuccess={() => {
            setCreateItem(null);
            onRefresh();
          }}
        />
      )}

      {/* Edit Modal */}
      {editItem && (() => {
        // Build organization data map from all providers
        const orgDataMap = new Map<string, {
          services: Array<{ name: string; service_name: string }>;
          providers: Array<{ name: string; provider_name: string }>;
          locations: Array<{ name: string; location_name: string }>;
        }>();
        
        providers.forEach(provider => {
          provider.organizations.forEach(org => {
            if (!orgDataMap.has(org.name)) {
              // Collect all unique services, providers, and locations for this organization
              const servicesSet = new Set<string>();
              const locationsSet = new Set<string>();
              
              org.locations.forEach(location => {
                locationsSet.add(location.name);
                location.services.forEach(service => {
                  servicesSet.add(service.name);
                });
              });
              
              orgDataMap.set(org.name, {
                services: Array.from(servicesSet).map(svcName => {
                  // Find service details
                  for (const loc of org.locations) {
                    const svc = loc.services.find(s => s.name === svcName);
                    if (svc) {
                      return { name: svc.name, service_name: svc.service_name };
                    }
                  }
                  return { name: svcName, service_name: svcName };
                }),
                providers: [{
                  name: provider.name,
                  provider_name: provider.provider_name
                }],
                locations: org.locations.map(l => ({
                  name: l.name,
                  location_name: l.location_name
                }))
              });
            } else {
              // Add this provider to existing org data
              const existing = orgDataMap.get(org.name)!;
              if (!existing.providers.find(p => p.name === provider.name)) {
                existing.providers.push({
                  name: provider.name,
                  provider_name: provider.provider_name
                });
              }
            }
          });
        });
        
        // Find which organization this item belongs to
        let orgData = undefined;
        if (editItem.service) {
          // Find organization that has this service
          for (const provider of providers) {
            for (const org of provider.organizations) {
              for (const location of org.locations) {
                if (location.services.some(s => s.name === editItem.service)) {
                  orgData = orgDataMap.get(org.name);
                  break;
                }
              }
              if (orgData) break;
            }
            if (orgData) break;
          }
        } else if (editItem.type === 'event_type' && editItem.service) {
          // EventType - find by service
          for (const provider of providers) {
            for (const org of provider.organizations) {
              for (const location of org.locations) {
                if (location.services.some(s => s.name === editItem.service)) {
                  orgData = orgDataMap.get(org.name);
                  break;
                }
              }
              if (orgData) break;
            }
            if (orgData) break;
          }
        }
        
        return (
          <EditItemModal
            isOpen={!!editItem}
            onClose={() => setEditItem(null)}
            item={editItem}
            organization={orgData}
            onSuccess={onRefresh}
          />
        );
      })()}
    </div>
  );
};

