/**
 * Edit Item Modal
 * Modal for editing existing Service, Location, or EventType
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { call, loading } = useFrappePostCall('appointment.api.manage.update_service');
  const { call: updateLocation, loading: locationLoading } = useFrappePostCall('appointment.api.manage.update_location');
  const { call: updateEventType, loading: eventTypeLoading } = useFrappePostCall('appointment.api.manage.update_event_type');

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)'
          }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />

          {/* Header */}
          <div 
            className="flex items-center justify-between p-6"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Edit {item.type === 'service' ? 'Service' : item.type === 'location' ? 'Location' : 'EventType'}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {item.type === 'service' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Service Name <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Duration (minutes) <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Buffer Before (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.buffer_before}
                      onChange={(e) => setFormData({ ...formData, buffer_before: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Buffer After (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.buffer_after}
                      onChange={(e) => setFormData({ ...formData, buffer_after: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="ETB" style={{ backgroundColor: 'var(--bg-elevated)' }}>ETB</option>
                      <option value="USD" style={{ backgroundColor: 'var(--bg-elevated)' }}>USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
            </>
          )}

              {item.type === 'location' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Location Name <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location_name}
                      onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Address <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <textarea
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="Africa/Addis_Ababa" style={{ backgroundColor: 'var(--bg-elevated)' }}>Africa/Addis_Ababa</option>
                      <option value="UTC" style={{ backgroundColor: 'var(--bg-elevated)' }}>UTC</option>
                    </select>
                  </div>
                </>
              )}

              {item.type === 'event_type' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      EventType Name <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.event_type_name}
                      onChange={(e) => setFormData({ ...formData, event_type_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Service <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      disabled={!organization?.services || organization.services.length === 0}
                    >
                      <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        {!organization?.services || organization.services.length === 0
                          ? 'No services available'
                          : 'Select a service'}
                      </option>
                      {organization?.services?.map((service) => (
                        <option key={service.name} value={service.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          {service.service_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Provider <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      disabled={!organization?.providers || organization.providers.length === 0}
                    >
                      <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        {!organization?.providers || organization.providers.length === 0
                          ? 'No providers available'
                          : 'Select a provider'}
                      </option>
                      {organization?.providers?.map((provider) => (
                        <option key={provider.name} value={provider.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          {provider.provider_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Location <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      disabled={!organization?.locations || organization.locations.length === 0}
                    >
                      <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        {!organization?.locations || organization.locations.length === 0
                          ? 'No locations available'
                          : 'Select a location'}
                      </option>
                      {organization?.locations?.map((location) => (
                        <option key={location.name} value={location.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          {location.location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={isLoading ? {} : { scale: 1.02 }}
                  whileTap={isLoading ? {} : { scale: 0.98 }}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                  style={{ 
                    background: isLoading 
                      ? 'var(--border-subtle)' 
                      : 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

