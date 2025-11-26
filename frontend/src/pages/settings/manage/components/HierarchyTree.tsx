/**
 * Hierarchy Tree Component
 * Recursive tree view showing organization structure
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Link as LinkIcon, Building2, MapPin, User, Calendar } from 'lucide-react';
import { Button } from '@/components/button';
import { ValidationBadge } from './ValidationBadge';
import { ItemCard } from './ItemCard';
import { CreateItemModal } from './CreateItemModal';
import { EditItemModal } from './EditItemModal';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';

interface HierarchyTreeProps {
  organization?: any;
  provider?: any;
  onRefresh: () => void;
}

export const HierarchyTree = ({ organization, provider, onRefresh }: HierarchyTreeProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['services', 'locations', 'providers']));
  const [createModalOpen, setCreateModalOpen] = useState<{ type: string; parentId?: string } | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { call: deleteService } = useFrappePostCall('frappe_appointment.api.manage.delete_service');
  const { call: deleteLocation } = useFrappePostCall('frappe_appointment.api.manage.delete_location');
  const { call: deleteEventType } = useFrappePostCall('frappe_appointment.api.manage.delete_event_type');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      if (type === 'service') {
        await deleteService({ service_id: id });
      } else if (type === 'location') {
        await deleteLocation({ location_id: id });
      } else if (type === 'event_type') {
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

  // Organization View
  if (organization) {
    return (
      <div className="space-y-4">
        {/* Organization Header with Booking URLs */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {organization.organization_name}
              </h2>
              <ValidationBadge status={organization.validation?.status || 'complete'} />
            </div>
          </div>
          
          {/* Booking URLs for Organization */}
          {organization.booking_urls && organization.booking_urls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking URLs:</span>
              </div>
              <div className="space-y-1">
                {organization.booking_urls.map((url: any, idx: number) => (
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({url.url_type})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Services Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('services')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('services') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Services ({organization.services?.length || 0})
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setCreateModalOpen({ type: 'service' });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Service
            </Button>
          </button>

          {expandedSections.has('services') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.services?.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No services created yet
                </p>
              ) : (
                organization.services?.map((service: any) => (
                  <ItemCard
                    key={service.name}
                    type="service"
                    item={service}
                    onEdit={() => setEditItem({ type: 'service', ...service })}
                    onDelete={() => handleDelete('service', service.name, service.service_name)}
                    onRefresh={onRefresh}
                  >
                    {/* Service Providers */}
                    {service.service_providers && service.service_providers.length > 0 && (
                      <div className="mt-2 ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Linked Providers:
                        </div>
                        {service.service_providers.map((sp: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                            {sp.provider_name} {sp.is_primary && '(Primary)'}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* EventTypes */}
                    {service.event_types && service.event_types.length > 0 && (
                      <div className="mt-2 ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          EventTypes:
                        </div>
                        {service.event_types.map((et: any) => (
                          <ItemCard
                            key={et.name}
                            type="event_type"
                            item={et}
                            onEdit={() => setEditItem({ type: 'event_type', ...et })}
                            onDelete={() => handleDelete('event_type', et.name, et.event_type_name)}
                            onRefresh={onRefresh}
                            nested
                          />
                        ))}
                      </div>
                    )}
                  </ItemCard>
                ))
              )}
            </div>
          )}
        </div>

        {/* Locations Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('locations')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('locations') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Locations ({organization.locations?.length || 0})
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setCreateModalOpen({ type: 'location', parentId: organization.name });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Location
            </Button>
          </button>

          {expandedSections.has('locations') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.locations?.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No locations created yet
                </p>
              ) : (
                organization.locations?.map((location: any) => (
                  <ItemCard
                    key={location.name}
                    type="location"
                    item={location}
                    onEdit={() => setEditItem({ type: 'location', ...location })}
                    onDelete={() => handleDelete('location', location.name, location.location_name)}
                    onRefresh={onRefresh}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Providers Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('providers')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('providers') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Providers ({organization.providers?.length || 0})
              </span>
            </div>
          </button>

          {expandedSections.has('providers') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.providers?.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No providers linked yet
                </p>
              ) : (
                organization.providers?.map((provider: any) => (
                  <ItemCard
                    key={provider.name}
                    type="provider"
                    item={provider}
                    onRefresh={onRefresh}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {createModalOpen && (
          <CreateItemModal
            isOpen={!!createModalOpen}
            onClose={() => setCreateModalOpen(null)}
            type={createModalOpen.type}
            organizationId={organization.name}
            organization={{
              services: organization.services,
              providers: organization.providers,
              locations: organization.locations,
            }}
            onSuccess={onRefresh}
          />
        )}

        {editItem && (
          <EditItemModal
            isOpen={!!editItem}
            onClose={() => setEditItem(null)}
            item={editItem}
            organization={{
              services: organization.services,
              providers: organization.providers,
              locations: organization.locations,
            }}
            onSuccess={onRefresh}
          />
        )}
      </div>
    );
  }

  // Individual Provider View
  if (provider) {
    return (
      <div className="space-y-4">
        {/* EventTypes Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('event_types')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('event_types') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                EventTypes ({provider.event_types?.length || 0})
              </span>
            </div>
          </button>

          {expandedSections.has('event_types') && (
            <div className="px-4 pb-4 space-y-2">
              {provider.event_types?.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No EventTypes created yet
                </p>
              ) : (
                provider.event_types?.map((et: any) => (
                  <ItemCard
                    key={et.name}
                    type="event_type"
                    item={et}
                    onEdit={() => setEditItem({ type: 'event_type', ...et })}
                    onDelete={() => handleDelete('event_type', et.name, et.event_type_name)}
                    onRefresh={onRefresh}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Locations Section */}
        {provider.locations && provider.locations.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Locations ({provider.locations.length})
              </span>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {provider.locations.map((location: any) => (
                <ItemCard
                  key={location.name}
                  type="location"
                  item={location}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {editItem && (
          <EditItemModal
            isOpen={!!editItem}
            onClose={() => setEditItem(null)}
            item={editItem}
            organization={{
              services: provider.services || [],
              providers: [{ name: provider.name, provider_name: provider.provider_name }], // Solo provider
              locations: provider.locations || [],
            }}
            onSuccess={onRefresh}
          />
        )}
      </div>
    );
  }

  return null;
};

