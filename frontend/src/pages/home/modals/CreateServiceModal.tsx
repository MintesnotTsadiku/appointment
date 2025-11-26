import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Plus, Loader2, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Checkbox } from '@/components/checkbox';

interface CreateServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  organizations: Array<{ name: string; organization_name: string }>;
  user_provider: { name: string; provider_name: string } | null;
  org_providers: Record<string, Array<{ name: string; provider_name: string; is_primary: boolean }>>;
  locations: Array<{ name: string; location_name: string; organization?: string }>;
  is_organization_user: boolean;
}

export const CreateServiceModal = ({ open, onOpenChange, onSuccess }: CreateServiceModalProps) => {
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('30');
  const [buffer, setBuffer] = useState('0');
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch form data (organizations, providers, locations)
  const { data: formData, isLoading: loadingFormData } = useFrappeGetCall<{ message: FormData }>(
    'frappe_appointment.onboarding.get_service_form_data',
    undefined,
    'service-form-data',
    {
      revalidateOnFocus: false,
    }
  );

  const formDataResult = formData?.message;

  // Update available providers when organization changes
  useEffect(() => {
    if (selectedOrganization && formDataResult?.org_providers) {
      const orgProviders = formDataResult.org_providers[selectedOrganization] || [];
      // Auto-select all providers by default
      setSelectedProviders(orgProviders.map(p => p.name));
    } else if (!selectedOrganization && formDataResult?.user_provider) {
      // Individual provider - auto-select user's provider
      setSelectedProviders([formDataResult.user_provider.name]);
    } else {
      setSelectedProviders([]);
    }
  }, [selectedOrganization, formDataResult]);

  // Auto-select first location if available
  useEffect(() => {
    if (formDataResult?.locations && formDataResult.locations.length > 0 && !selectedLocation) {
      setSelectedLocation(formDataResult.locations[0].name);
    }
  }, [formDataResult?.locations, selectedLocation]);

  // Auto-select organization if user has only one
  useEffect(() => {
    if (formDataResult?.organizations && formDataResult.organizations.length === 1 && !selectedOrganization) {
      setSelectedOrganization(formDataResult.organizations[0].name);
    }
  }, [formDataResult?.organizations, selectedOrganization]);

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.create_service');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!serviceName || serviceName.trim().length < 3) {
      newErrors.serviceName = 'Service name must be at least 3 characters';
    }
    if (!duration || parseInt(duration) < 5) {
      newErrors.duration = 'Duration must be at least 5 minutes';
    }
    if (!selectedLocation) {
      newErrors.location = 'Please select a location';
    }
    if (selectedOrganization && selectedProviders.length === 0) {
      newErrors.providers = 'Please select at least one provider';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await call({
        name: serviceName,
        duration: parseInt(duration),
        buffer_time: parseInt(buffer) || 0,
        price: parseFloat(price) || 0,
        description: description || '',
        organization: selectedOrganization || undefined,
        location: selectedLocation,
        selected_providers: selectedOrganization && selectedProviders.length > 0 ? selectedProviders : undefined,
      });

      // Reset form
      setServiceName('');
      setDuration('30');
      setBuffer('0');
      setPrice('0');
      setDescription('');
      setSelectedOrganization('');
      setSelectedLocation('');
      setSelectedProviders([]);
      setErrors({});

      // Close modal
      onOpenChange(false);
      
      // Notify parent
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to create service. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Service
          </DialogTitle>
          <DialogDescription>
            Add a new appointment type that customers can book
          </DialogDescription>
        </DialogHeader>

        {loadingFormData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Organization Selection (if user has organizations) */}
            {formDataResult?.is_organization_user && formDataResult.organizations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="organization">
                  Organization <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedOrganization}
                  onValueChange={(value) => {
                    setSelectedOrganization(value);
                    setErrors({ ...errors, organization: '' });
                  }}
                >
                  <SelectTrigger className={errors.organization ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDataResult.organizations.map((org) => (
                      <SelectItem key={org.name} value={org.name}>
                        {org.organization_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organization && (
                  <p className="text-sm text-red-500">{errors.organization}</p>
                )}
              </div>
            )}

            {/* Provider Selection (if organization selected) */}
            {selectedOrganization && formDataResult?.org_providers[selectedOrganization] && (
              <div className="space-y-2">
                <Label>
                  Providers <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {formDataResult.org_providers[selectedOrganization].map((provider) => (
                    <div key={provider.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`provider-${provider.name}`}
                        checked={selectedProviders.includes(provider.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProviders([...selectedProviders, provider.name]);
                          } else {
                            setSelectedProviders(selectedProviders.filter(p => p !== provider.name));
                          }
                          setErrors({ ...errors, providers: '' });
                        }}
                      />
                      <Label
                        htmlFor={`provider-${provider.name}`}
                        className="font-normal cursor-pointer flex-1"
                      >
                        {provider.provider_name}
                        {provider.is_primary && (
                          <span className="ml-2 text-xs text-gray-500">(Primary)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.providers && (
                  <p className="text-sm text-red-500">{errors.providers}</p>
                )}
              </div>
            )}

            {/* Location Selection */}
            {formDataResult?.locations && formDataResult.locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedLocation}
                  onValueChange={(value) => {
                    setSelectedLocation(value);
                    setErrors({ ...errors, location: '' });
                  }}
                >
                  <SelectTrigger className={errors.location ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDataResult.locations.map((loc) => (
                      <SelectItem key={loc.name} value={loc.name}>
                        {loc.location_name}
                        {loc.organization && (
                          <span className="text-xs text-gray-500 ml-2">(Org Branch)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location}</p>
                )}
              </div>
            )}

            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="serviceName">
                Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="serviceName"
                placeholder="e.g., 30-min Consultation"
                value={serviceName}
                onChange={(e) => {
                  setServiceName(e.target.value);
                  if (errors.serviceName) setErrors({ ...errors, serviceName: '' });
                }}
                className={errors.serviceName ? 'border-red-500' : ''}
              />
              {errors.serviceName && (
                <p className="text-sm text-red-500">{errors.serviceName}</p>
              )}
            </div>

            {/* Duration, Buffer, and Price */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Duration (min) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    if (errors.duration) setErrors({ ...errors, duration: '' });
                  }}
                  className={errors.duration ? 'border-red-500' : ''}
                />
                {errors.duration && (
                  <p className="text-sm text-red-500">{errors.duration}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer (min)</Label>
                <Input
                  id="buffer"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="0"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
                <p className="text-xs text-gray-500">Between bookings</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (ETB)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What customers can expect from this service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Availability Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Availability Configuration</p>
                <p className="text-xs">
                  Availability hours will be inherited from the selected Location by default. 
                  You can customize availability later in the Service form after creation.
                </p>
              </div>
            </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Service
            </Button>
          </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

