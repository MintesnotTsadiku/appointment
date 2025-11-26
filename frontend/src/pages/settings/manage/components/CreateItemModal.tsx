/**
 * Create Item Modal
 * Reusable modal for creating Service, Location, or EventType
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/button';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'service' | 'location' | 'event_type';
  organizationId?: string;
  organization?: {
    services?: Array<{ name: string; service_name: string }>;
    providers?: Array<{ name: string; provider_name: string }>;
    locations?: Array<{ name: string; location_name: string }>;
  };
  context?: {
    provider?: string;
    service?: string;
    location?: string;
    organization?: string;
  };
  onSuccess: () => void;
}

export const CreateItemModal = ({ isOpen, onClose, type, organizationId, organization, context, onSuccess }: CreateItemModalProps) => {
  const { call: createService, loading } = useFrappePostCall('frappe_appointment.api.manage.create_service');
  const { call: createLocation, loading: locationLoading } = useFrappePostCall('frappe_appointment.api.manage.create_location');
  const { call: createEventType, loading: eventTypeLoading } = useFrappePostCall('frappe_appointment.api.manage.create_event_type');

  const [formData, setFormData] = useState<any>({
    service_name: '',
    duration: 30,
    price: 0,
    currency: 'ETB',
    description: '',
    buffer_before: 5,
    buffer_after: 5,
    location_name: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Addis Ababa',
    phone: '',
    timezone: 'Africa/Addis_Ababa',
    event_type_name: '',
    service: context?.service || '',
    provider: context?.provider || '',
    location: context?.location || '',
  });

  // Update form data when context changes
  useEffect(() => {
    if (context) {
      setFormData((prev: any) => ({
        ...prev,
        service: context.service || prev.service,
        provider: context.provider || prev.provider,
        location: context.location || prev.location,
      }));
    }
  }, [context]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (type === 'service') {
        await createService({
          service_name: formData.service_name,
          duration: parseInt(formData.duration),
          organization: organizationId,
          price: parseFloat(formData.price),
          currency: formData.currency,
          description: formData.description,
          buffer_before: parseInt(formData.buffer_before),
          buffer_after: parseInt(formData.buffer_after),
        });
        toast.success('Service created successfully');
      } else if (type === 'location') {
        await createLocation({
          location_name: formData.location_name,
          organization: organizationId,
          address_line_1: formData.address_line_1,
          address_line_2: formData.address_line_2,
          city: formData.city,
          phone: formData.phone,
          timezone: formData.timezone,
        });
        toast.success('Location created successfully');
      } else if (type === 'event_type') {
        await createEventType({
          event_type_name: formData.event_type_name,
          service: formData.service,
          provider: formData.provider,
          location: formData.location,
          description: formData.description,
        });
        toast.success('EventType created successfully');
      }

      onSuccess();
      onClose();
      setFormData({
        service_name: '',
        duration: 30,
        price: 0,
        currency: 'ETB',
        description: '',
        buffer_before: 5,
        buffer_after: 5,
        location_name: '',
        address_line_1: '',
        address_line_2: '',
        city: 'Addis Ababa',
        phone: '',
        timezone: 'Africa/Addis_Ababa',
    event_type_name: '',
    service: context?.service || '',
    provider: context?.provider || '',
    location: context?.location || '',
  });

  // Update form data when context changes
  useEffect(() => {
    if (context) {
      setFormData((prev: any) => ({
        ...prev,
        service: context.service || prev.service,
        provider: context.provider || prev.provider,
        location: context.location || prev.location,
      }));
    }
  }, [context]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create item');
    }
  };

  const isLoading = loading || locationLoading || eventTypeLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create {type === 'service' ? 'Service' : type === 'location' ? 'Location' : 'EventType'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'service' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Buffer Before (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.buffer_before}
                      onChange={(e) => setFormData({ ...formData, buffer_before: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Buffer After (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.buffer_after}
                      onChange={(e) => setFormData({ ...formData, buffer_after: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="ETB">ETB</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          {type === 'location' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Africa/Addis_Ababa">Africa/Addis_Ababa</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </>
          )}

          {type === 'event_type' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  EventType Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.event_type_name}
                  onChange={(e) => setFormData({ ...formData, event_type_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service *
                </label>
                <select
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!organization?.services || organization.services.length === 0}
                >
                  <option value="">
                    {!organization?.services || organization.services.length === 0
                      ? 'No services available. Create a service first.'
                      : 'Select a service'}
                  </option>
                  {organization?.services?.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.service_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider *
                </label>
                <select
                  required
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!organization?.providers || organization.providers.length === 0}
                >
                  <option value="">
                    {!organization?.providers || organization.providers.length === 0
                      ? 'No providers available. Add providers to the organization first.'
                      : 'Select a provider'}
                  </option>
                  {organization?.providers?.map((provider) => (
                    <option key={provider.name} value={provider.name}>
                      {provider.provider_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location *
                </label>
                <select
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!organization?.locations || organization.locations.length === 0}
                >
                  <option value="">
                    {!organization?.locations || organization.locations.length === 0
                      ? 'No locations available. Create a location first.'
                      : 'Select a location'}
                  </option>
                  {organization?.locations?.map((location) => (
                    <option key={location.name} value={location.name}>
                      {location.location_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

