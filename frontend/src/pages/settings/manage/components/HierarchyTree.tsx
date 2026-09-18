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
  const { call: deleteService } = useFrappePostCall('appointment.api.manage.delete_service');
  const { call: deleteLocation } = useFrappePostCall('appointment.api.manage.delete_location');
  const { call: deleteEventType } = useFrappePostCall('appointment.api.manage.delete_event_type');

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
        <div 
          className="rounded-xl p-4 backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {organization.organization_name}
              </h2>
              <ValidationBadge status={organization.validation?.status || 'complete'} />
            </div>
          </div>
          
          {/* Booking URLs for Organization */}
          {organization.booking_urls && organization.booking_urls.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Booking URLs:</span>
              </div>
              <div className="space-y-1">
                {organization.booking_urls.map((url: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <a
                      href={url.full_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <LinkIcon className="w-3 h-3" />
                      {url.description || url.url_type || url.full_url}
                    </a>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ({url.url_type})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Services Section */}
        <div 
          className="rounded-xl backdrop-blur-sm"
          style={{
            border: '1px solid var(--border-default)'
          }}
        >
          <div
            className="w-full px-4 py-3 flex items-center justify-between transition-colors rounded-t-xl"
            style={{
              backgroundColor: 'transparent',
              borderBottom: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <button
              type="button"
              data-qa="manage-services-toggle"
              aria-expanded={expandedSections.has('services')}
              onClick={() => toggleSection('services')}
              className="flex flex-1 items-center gap-2 text-left"
            >
              {expandedSections.has('services') ? (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <Building2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Services ({organization.services?.length || 0})
              </span>
            </button>
            <Button
              size="sm"
              variant="outline"
              data-qa="manage-add-service"
              onClick={() => setCreateModalOpen({ type: 'service' })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Service
            </Button>
          </div>

          {expandedSections.has('services') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.services?.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
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
                      <div className="mt-2 ml-6 pl-4" style={{ borderLeft: '2px solid var(--border-subtle)' }}>
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                          Linked Providers:
                        </div>
                        {service.service_providers.map((sp: any, idx: number) => (
                          <div key={idx} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {sp.provider_name} {sp.is_primary && '(Primary)'}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* EventTypes */}
                    {service.event_types && service.event_types.length > 0 && (
                      <div className="mt-2 ml-6 pl-4" style={{ borderLeft: '2px solid var(--border-subtle)' }}>
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
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
        <div 
          className="rounded-xl backdrop-blur-sm"
          style={{
            border: '1px solid var(--border-default)'
          }}
        >
          <div
            className="w-full px-4 py-3 flex items-center justify-between transition-colors rounded-t-xl"
            style={{
              backgroundColor: 'transparent',
              borderBottom: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <button
              type="button"
              data-qa="manage-locations-toggle"
              aria-expanded={expandedSections.has('locations')}
              onClick={() => toggleSection('locations')}
              className="flex flex-1 items-center gap-2 text-left"
            >
              {expandedSections.has('locations') ? (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Locations ({organization.locations?.length || 0})
              </span>
            </button>
            <Button
              size="sm"
              variant="outline"
              data-qa="manage-add-location"
              onClick={() => setCreateModalOpen({ type: 'location', parentId: organization.name })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Location
            </Button>
          </div>

          {expandedSections.has('locations') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.locations?.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
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
        <div 
          className="rounded-xl backdrop-blur-sm"
          style={{
            border: '1px solid var(--border-default)'
          }}
        >
          <button
            type="button"
            data-qa="manage-providers-toggle"
            aria-expanded={expandedSections.has('providers')}
            onClick={() => toggleSection('providers')}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors rounded-t-xl"
            style={{
              backgroundColor: 'transparent',
              borderBottom: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('providers') ? (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Providers ({organization.providers?.length || 0})
              </span>
            </div>
          </button>

          {expandedSections.has('providers') && (
            <div className="px-4 pb-4 space-y-2">
              {organization.providers?.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
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
        <div 
          className="rounded-xl backdrop-blur-sm"
          style={{
            border: '1px solid var(--border-default)'
          }}
        >
          <button
            onClick={() => toggleSection('event_types')}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors rounded-t-xl"
            style={{
              backgroundColor: 'transparent',
              borderBottom: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('event_types') ? (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                EventTypes ({provider.event_types?.length || 0})
              </span>
            </div>
          </button>

          {expandedSections.has('event_types') && (
            <div className="px-4 pb-4 space-y-2">
              {provider.event_types?.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
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
          <div 
            className="rounded-xl backdrop-blur-sm"
            style={{
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="px-4 py-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
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

