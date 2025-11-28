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
  DialogClose,
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
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/home')}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Location Settings
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                        style={{
                          background: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary-light)'
                        }}
                      >
                        PRO
                      </span>
                    </h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Manage your business locations
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenCreate}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                <Plus className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Add Location</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary-light)'
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      About Locations
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Locations define where you provide services. Each location can have its own address and opening hours. 
                      You can link multiple locations to your provider profile.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Locations List */}
            {isLoading ? (
              <Card
                className="p-12 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : locations && locations.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {locations.map((location, index) => (
                    <motion.div
                      key={location.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
                      <Card
                        className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                              <MapPin className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                              {location.location_name}
                            </h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                              {location.address}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-subtle)' }}>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {location.opening_hours_count} hours set
                              </span>
                              <span>{location.timezone}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleOpenEdit(location)}
                              className="p-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: 'var(--border-subtle)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(location)}
                              disabled={deleting}
                              className="p-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: 'var(--border-subtle)',
                                color: 'var(--accent-secondary)'
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                        {!location.has_opening_hours && (
                          <div
                            className="mt-4 p-3 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--accent-secondary-light)',
                              borderColor: 'var(--accent-secondary-light)'
                            }}
                          >
                            <p className="text-xs" style={{ color: 'var(--accent-secondary)' }}>
                              ⚠️ No opening hours set. Set availability to accept bookings.
                            </p>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="p-6 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-primary mb-4">
                      <MapPin className="w-16 h-16 text-white" />
                    </div>
                    <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                      No locations added yet
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenCreate}
                      className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden mx-auto"
                    >
                      <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                      <Plus className="relative z-10 w-4 h-4" />
                      <span className="relative z-10">Add Your First Location</span>
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Quick Link to Availability */}
            {locations && locations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card
                  className="p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                  onClick={() => navigate('/settings/availability')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        Set Opening Hours
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Configure when you're available at each location
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--border-subtle)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <Clock className="w-4 h-4" />
                      Edit Availability
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </main>

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent
            className="relative w-full max-w-[500px] border rounded-2xl shadow-2xl overflow-hidden p-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)'
            }}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

            <DialogHeader className="p-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur opacity-50" />
                  <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </div>
                {editingLocation ? 'Edit Location' : 'Create New Location'}
              </DialogTitle>
              <DialogDescription className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {editingLocation ? 'Update location details' : 'Add a new location where you provide services'}
              </DialogDescription>
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogHeader>

            <div className="space-y-4 mt-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="location_name" style={{ color: 'var(--text-primary)' }}>
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
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: errors.location_name ? 'red-500' : 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
                {errors.location_name && (
                  <p className="text-sm text-red-500">{errors.location_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line_1" style={{ color: 'var(--text-primary)' }}>
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
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: errors.address_line_1 ? 'red-500' : 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
                {errors.address_line_1 && (
                  <p className="text-sm text-red-500">{errors.address_line_1}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line_2" style={{ color: 'var(--text-primary)' }}>Address Line 2 (Optional)</Label>
                <Input
                  id="address_line_2"
                  placeholder="e.g., Building 123, Floor 2"
                  value={formData.address_line_2}
                  onChange={(e) => {
                    setFormData({ ...formData, address_line_2: e.target.value });
                  }}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" style={{ color: 'var(--text-primary)' }}>
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
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: errors.city ? 'red-500' : 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" style={{ color: 'var(--text-primary)' }}>Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+251 911 234 567"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                    }}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" style={{ color: 'var(--text-primary)' }}>Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value} style={{ color: 'var(--text-primary)' }}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider Selection - Only show if multiple providers available and creating (not editing) */}
              {!editingLocation && availableProviders.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="provider_id" style={{ color: 'var(--text-primary)' }}>
                    Assign to Provider
                  </Label>
                  <Select
                    value={formData.provider_id}
                    onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
                  >
                    <SelectTrigger
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-default)'
                      }}
                    >
                      {availableProviders.map((provider) => (
                        <SelectItem key={provider.name} value={provider.name} style={{ color: 'var(--text-primary)' }}>
                          {provider.provider_name} {provider.full_name ? `(${provider.full_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    Select which provider this location belongs to
                  </p>
                </div>
              )}

              {/* Service Selection - Only show if services available and creating (not editing) */}
              {!editingLocation && availableServices.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="service_ids" style={{ color: 'var(--text-primary)' }}>
                    Link to Services (Optional)
                  </Label>
                  <div
                    className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
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
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <label
                          htmlFor={`service-${service.name}`}
                          className="text-sm cursor-pointer flex-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <span className="font-medium">{service.service_name}</span>
                          {service.description && (
                            <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                              - {service.description}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    Select which services are available at this location
                  </p>
                </div>
              )}

              {errors.submit && (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--accent-secondary-light)',
                    borderColor: 'var(--accent-secondary-light)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--accent-secondary)' }}>{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={creating}
                  className="bg-gradient-primary text-white hover:opacity-90"
                >
                  {creating ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LocationSettings;
