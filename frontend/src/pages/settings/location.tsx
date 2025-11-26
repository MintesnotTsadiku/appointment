import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Plus, Clock, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import Spinner from '@/components/spinner';

interface Location {
  name: string;
  location_name: string;
  address: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  phone?: string;
  timezone: string;
  opening_hours_count: number;
  has_opening_hours: boolean;
}

const LocationSettings = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    location_name: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Addis Ababa',
    phone: '',
    timezone: 'Africa/Addis_Ababa',
    provider_id: '',
    service_ids: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, mutate } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'frappe_appointment.onboarding.get_provider_locations',
    undefined,
    'provider-locations'
  );

  // Get available providers and services for location assignment
  const { data: optionsData } = useFrappeGetCall<{ 
    message: { 
      providers: Array<{ name: string; provider_name: string; full_name?: string }>;
      services: Array<{ name: string; service_name: string; description?: string }>;
    } 
  }>(
    'frappe_appointment.onboarding.get_location_options',
    undefined,
    'location-options'
  );

  const { call: createLocation, loading: creating } = useFrappePostCall('frappe_appointment.onboarding.create_location');
  const { call: deleteLocation, loading: deleting } = useFrappePostCall('frappe_appointment.onboarding.delete_location');

  const availableProviders = optionsData?.message?.providers || [];
  const availableServices = optionsData?.message?.services || [];

  const locations = data?.message?.locations || [];

  const timezones = [
    { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
  ];

  const handleOpenCreate = () => {
    // Set default provider to first available (usually current user's provider)
    const defaultProvider = availableProviders.length > 0 ? availableProviders[0].name : '';
    setFormData({ 
      location_name: '', 
      address_line_1: '', 
      address_line_2: '', 
      city: 'Addis Ababa',
      phone: '',
      timezone: 'Africa/Addis_Ababa',
      provider_id: defaultProvider,
      service_ids: []
    });
    setErrors({});
    setEditingLocation(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (location: Location) => {
    setFormData({
      location_name: location.location_name,
      address_line_1: location.address_line_1 || '',
      address_line_2: location.address_line_2 || '',
      city: location.city || 'Addis Ababa',
      phone: location.phone || '',
      timezone: location.timezone,
    });
    setErrors({});
    setEditingLocation(location);
    setShowCreateModal(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.location_name || formData.location_name.trim().length < 2) {
      newErrors.location_name = 'Location name must be at least 2 characters';
    }
    if (!formData.address_line_1 || formData.address_line_1.trim().length < 3) {
      newErrors.address_line_1 = 'Address line 1 is required';
    }
    if (!formData.city || formData.city.trim().length < 2) {
      newErrors.city = 'City is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (editingLocation) {
        // TODO: Add update_location API
        alert('Update functionality coming soon');
      } else {
        await createLocation({
          location_name: formData.location_name,
          address_line_1: formData.address_line_1,
          address_line_2: formData.address_line_2,
          city: formData.city,
          phone: formData.phone,
          timezone: formData.timezone,
          provider_id: formData.provider_id || undefined,
          service_ids: formData.service_ids.length > 0 ? formData.service_ids : undefined,
        });
        mutate();
        setShowCreateModal(false);
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to save location. Please try again.' });
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.location_name}"?`)) {
      return;
    }

    try {
      await deleteLocation({ location_name: location.location_name });
      mutate();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete location. It may be in use by active services.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/home')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  Location Settings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your business locations
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  About Locations
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Locations define where you provide services. Each location can have its own address and opening hours. 
                  You can link multiple locations to your provider profile.
                </p>
              </div>
            </div>
          </Card>

          {/* Locations List */}
          {isLoading ? (
            <Card className="p-12">
              <div className="flex items-center justify-center">
                <Spinner />
              </div>
            </Card>
          ) : locations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((location) => (
                <Card key={location.name} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        {location.location_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {location.address}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {location.opening_hours_count} hours set
                        </span>
                        <span>{location.timezone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(location)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(location)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {!location.has_opening_hours && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ No opening hours set. Set availability to accept bookings.
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No locations added yet
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Location
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Link to Availability */}
          {locations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Set Opening Hours
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure when you're available at each location
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings/availability')}
                  className="flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Edit Availability
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingLocation ? 'Edit Location' : 'Create New Location'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation ? 'Update location details' : 'Add a new location where you provide services'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">
                Location Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location_name"
                placeholder="e.g., Main Office, Bole Branch"
                value={formData.location_name}
                onChange={(e) => {
                  setFormData({ ...formData, location_name: e.target.value });
                  if (errors.location_name) setErrors({ ...errors, location_name: '' });
                }}
                className={errors.location_name ? 'border-red-500' : ''}
              />
              {errors.location_name && (
                <p className="text-sm text-red-500">{errors.location_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_1">
                Address Line 1 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address_line_1"
                placeholder="e.g., Bole Road, Near Edna Mall"
                value={formData.address_line_1}
                onChange={(e) => {
                  setFormData({ ...formData, address_line_1: e.target.value });
                  if (errors.address_line_1) setErrors({ ...errors, address_line_1: '' });
                }}
                className={errors.address_line_1 ? 'border-red-500' : ''}
              />
              {errors.address_line_1 && (
                <p className="text-sm text-red-500">{errors.address_line_1}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line_2"
                placeholder="e.g., Building 123, Floor 2"
                value={formData.address_line_2}
                onChange={(e) => {
                  setFormData({ ...formData, address_line_2: e.target.value });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g., Addis Ababa"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData({ ...formData, city: e.target.value });
                    if (errors.city) setErrors({ ...errors, city: '' });
                  }}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+251 911 234 567"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider Selection - Only show if multiple providers available and creating (not editing) */}
            {!editingLocation && availableProviders.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="provider_id">
                  Assign to Provider
                </Label>
                <Select
                  value={formData.provider_id}
                  onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider.name} value={provider.name}>
                        {provider.provider_name} {provider.full_name ? `(${provider.full_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select which provider this location belongs to
                </p>
              </div>
            )}

            {/* Service Selection - Only show if services available and creating (not editing) */}
            {!editingLocation && availableServices.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="service_ids">
                  Link to Services (Optional)
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {availableServices.map((service) => (
                    <div key={service.name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`service-${service.name}`}
                        checked={formData.service_ids.includes(service.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              service_ids: [...formData.service_ids, service.name]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              service_ids: formData.service_ids.filter(id => id !== service.name)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`service-${service.name}`}
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                      >
                        <span className="font-medium">{service.service_name}</span>
                        {service.description && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            - {service.description}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select which services are available at this location
                </p>
              </div>
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating}>
                {creating ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationSettings;
