import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Loader2, 
  Info, 
  X,
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  Building2,
  Users,
  FileText,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [activeField, setActiveField] = useState<string | null>(null);

  // Fetch form data
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
      setSelectedProviders(orgProviders.map(p => p.name));
    } else if (!selectedOrganization && formDataResult?.user_provider) {
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

      toast.success('Service created successfully!', {
        description: `${serviceName} is now available for booking`,
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
      toast.error('Failed to create service', {
        description: error?.message || 'Please try again.',
      });
      setErrors({ submit: error?.message || 'Failed to create service. Please try again.' });
    }
  };

  const InputField = ({ 
    id, 
    label, 
    icon: Icon, 
    type = 'text', 
    placeholder,
    value,
    onChange,
    required,
    ...props 
  }: { 
    id: string; 
    label: string; 
    icon: React.ElementType; 
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    [key: string]: any;
  }) => (
    <div className="relative">
      <label 
        className="block text-xs font-medium mb-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--status-cancelled)' }}> *</span>}
      </label>
      <div className="relative">
        <div 
          className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors`}
          style={{ color: activeField === id ? 'var(--accent-primary)' : 'var(--text-muted)' }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={value || ''}
          onChange={onChange}
          onFocus={() => setActiveField(id)}
          onBlur={() => setActiveField(null)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            errors[id] 
              ? 'border-red-500/50 focus:ring-red-500/20' 
              : 'focus:ring-violet-500/20'
          }`}
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${errors[id] ? 'var(--status-cancelled)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)'
          }}
          {...props}
        />
      </div>
      {errors[id] && (
        <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors[id]}</p>
      )}
    </div>
  );

  if (!open) return null;

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
          onClick={() => onOpenChange(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
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
            <div className="flex items-center gap-3">
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                />
                <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Create New Service
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add a new appointment type that customers can book
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Form */}
          {loadingFormData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Organization Selection */}
              {formDataResult?.is_organization_user && formDataResult.organizations.length > 0 && (
                <div className="relative">
                  <label 
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Organization <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                  </label>
                  <div className="relative">
                    <div 
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedOrganization}
                      onChange={(e) => {
                        setSelectedOrganization(e.target.value);
                        setErrors({ ...errors, organization: '' });
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: `1px solid ${errors.organization ? 'var(--status-cancelled)' : 'var(--border-default)'}`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        Select organization
                      </option>
                      {formDataResult.organizations.map((org) => (
                        <option key={org.name} value={org.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          {org.organization_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.organization && (
                    <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors.organization}</p>
                  )}
                </div>
              )}

              {/* Provider Selection */}
              {selectedOrganization && formDataResult?.org_providers[selectedOrganization] && (
                <div className="relative">
                  <label 
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Providers <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                  </label>
                  <div 
                    className="space-y-2 max-h-40 overflow-y-auto rounded-xl p-3"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      border: `1px solid ${errors.providers ? 'var(--status-cancelled)' : 'var(--border-default)'}`
                    }}
                  >
                    {formDataResult.org_providers[selectedOrganization].map((provider) => (
                      <label key={provider.name} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(provider.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProviders([...selectedProviders, provider.name]);
                            } else {
                              setSelectedProviders(selectedProviders.filter(p => p !== provider.name));
                            }
                            setErrors({ ...errors, providers: '' });
                          }}
                          className="rounded"
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {provider.provider_name}
                          {provider.is_primary && (
                            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              (Primary)
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.providers && (
                    <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors.providers}</p>
                  )}
                </div>
              )}

              {/* Location Selection */}
              {formDataResult?.locations && formDataResult.locations.length > 0 && (
                <div className="relative">
                  <label 
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Location <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                  </label>
                  <div className="relative">
                    <div 
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setErrors({ ...errors, location: '' });
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: `1px solid ${errors.location ? 'var(--status-cancelled)' : 'var(--border-default)'}`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        Select location
                      </option>
                      {formDataResult.locations.map((loc) => (
                        <option key={loc.name} value={loc.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          {loc.location_name}
                          {loc.organization && ' (Org Branch)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.location && (
                    <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors.location}</p>
                  )}
                </div>
              )}

              {/* Service Name */}
              <InputField 
                id="serviceName" 
                label="Service Name" 
                icon={Briefcase} 
                placeholder="e.g., 30-min Consultation"
                required
                value={serviceName}
                onChange={(e) => {
                  setServiceName(e.target.value);
                  if (errors.serviceName) setErrors({ ...errors, serviceName: '' });
                }}
              />

              {/* Duration, Buffer, and Price */}
              <div className="grid grid-cols-3 gap-4">
                <InputField 
                  id="duration" 
                  label="Duration (min)" 
                  icon={Clock} 
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  required
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    if (errors.duration) setErrors({ ...errors, duration: '' });
                  }}
                />
                <InputField 
                  id="buffer" 
                  label="Buffer (min)" 
                  icon={Clock} 
                  type="number"
                  min="0"
                  step="5"
                  placeholder="0"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
                <InputField 
                  id="price" 
                  label="Price (ETB)" 
                  icon={DollarSign} 
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="relative">
                <label 
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Description (Optional)
                </label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-3"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What customers can expect from this service..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Info Box */}
              <div 
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ 
                  backgroundColor: 'var(--accent-primary-light)',
                  border: '1px solid var(--accent-primary-light)'
                }}
              >
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <div className="text-sm">
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Availability Configuration
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Availability hours will be inherited from the selected Location by default. 
                    You can customize availability later in the Service form after creation.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div 
                  className="rounded-xl p-4"
                  style={{ 
                    backgroundColor: 'var(--status-cancelled-bg)',
                    border: '1px solid var(--status-cancelled)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--status-cancelled)' }}>{errors.submit}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group px-5 py-2.5 rounded-xl text-sm font-medium text-white overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                  <div className="relative z-10 flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Sparkles className="w-4 h-4" />
                    Create Service
                  </div>
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
