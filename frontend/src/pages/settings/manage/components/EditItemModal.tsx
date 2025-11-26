/**
 * Edit Item Modal
 * Modal for editing existing Service, Location, or EventType
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/button';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  organization?: {
    services?: Array<{ name: string; service_name: string }>;
    providers?: Array<{ name: string; provider_name: string }>;
    locations?: Array<{ name: string; location_name: string }>;
  };
  onSuccess: () => void;
}

export const EditItemModal = ({ isOpen, onClose, item, organization, onSuccess }: EditItemModalProps) => {
  const { call, loading } = useFrappePostCall('frappe_appointment.api.manage.update_service');
  const { call: updateLocation, loading: locationLoading } = useFrappePostCall('frappe_appointment.api.manage.update_location');
  const { call: updateEventType, loading: eventTypeLoading } = useFrappePostCall('frappe_appointment.api.manage.update_event_type');

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (item) {
      if (item.type === 'service') {
        setFormData({
          service_name: item.service_name || '',
          duration: item.duration || 30,
          price: item.price || 0,
          currency: item.currency || 'ETB',
          description: item.description || '',
          buffer_before: item.buffer_before || 5,
          buffer_after: item.buffer_after || 5,
        });
      } else if (item.type === 'location') {
        setFormData({
          location_name: item.location_name || '',
          address_line_1: item.address_line_1 || '',
          address_line_2: item.address_line_2 || '',
          city: item.city || 'Addis Ababa',
          phone: item.phone || '',
          timezone: item.timezone || 'Africa/Addis_Ababa',
        });
      } else if (item.type === 'event_type') {
        setFormData({
          event_type_name: item.event_type_name || '',
          service: item.service || '',
          provider: item.provider || '',
          location: item.location || '',
          description: item.description || '',
        });
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (item.type === 'service') {
        await call({
          service_id: item.name,
          service_name: formData.service_name,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          currency: formData.currency,
          description: formData.description,
          buffer_before: parseInt(formData.buffer_before),
          buffer_after: parseInt(formData.buffer_after),
        });
        toast.success('Service updated successfully');
      } else if (item.type === 'location') {
        await updateLocation({
          location_id: item.name,
          location_name: formData.location_name,
          address_line_1: formData.address_line_1,
          address_line_2: formData.address_line_2,
          city: formData.city,
          phone: formData.phone,
          timezone: formData.timezone,
        });
        toast.success('Location updated successfully');
      } else if (item.type === 'event_type') {
        await updateEventType({
          event_type_id: item.name,
          event_type_name: formData.event_type_name,
          service: formData.service,
          provider: formData.provider,
          location: formData.location,
          description: formData.description,
        });
        toast.success('EventType updated successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update item');
    }
  };

  const isLoading = loading || locationLoading || eventTypeLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit {item.type === 'service' ? 'Service' : item.type === 'location' ? 'Location' : 'EventType'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {item.type === 'service' && (
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

          {item.type === 'location' && (
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
                  Address *
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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

          {item.type === 'event_type' && (
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
                      ? 'No services available'
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
                      ? 'No providers available'
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
                      ? 'No locations available'
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
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

