import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, UserPlus, X, Check, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Checkbox } from '@/components/checkbox';
import { LinkProviderModal } from './modals/LinkProviderModal';
import Spinner from '@/components/spinner';

interface ServiceProvider {
  name: string;
  provider_name: string;
  email: string;
  phone?: string;
  is_primary: boolean;
  status: string;
  price_override?: number;
  duration_override?: number;
  commission_rate?: number;
  notes?: string;
}

interface ServiceDetails {
  name: string;
  service_name: string;
  description: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  organization: string;
  currency: string;
}

const EditService = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [linkProviderModalOpen, setLinkProviderModalOpen] = useState(false);

  // Fetch service details
  const { data: serviceData, isLoading: loadingService, mutate: refreshService } = useFrappeGetCall<{
    message: { success: boolean; service: ServiceDetails; providers: ServiceProvider[]; error?: string };
  }>(
    'appointment.onboarding.get_service_details',
    serviceId ? { service_id: serviceId } : undefined,
    `service-details-${serviceId}`,
    {
      revalidateOnFocus: false,
    }
  );

  const { call: updateService, loading: updating } = useFrappePostCall('appointment.onboarding.create_service');
  const { call: removeProvider, loading: removingProvider } = useFrappePostCall('appointment.onboarding.remove_provider_from_service');

  const service = serviceData?.message?.service;
  const providers = serviceData?.message?.providers || [];

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('0');
  const [buffer, setBuffer] = useState('0');

  // Update form when service data loads
  useEffect(() => {
    if (service) {
      setServiceName(service.service_name);
      setDescription(service.description || '');
      setDuration(service.duration.toString());
      setPrice(service.price.toString());
      setBuffer(service.buffer_before.toString());
    }
  }, [service]);

  const handleSave = async () => {
    if (!serviceId || !service) return;

    try {
      // Get currently linked providers
      const selectedProviders = providers.map(p => ({
        provider: p.name,
        is_primary: p.is_primary,
        price_override: p.price_override,
        duration_override: p.duration_override,
        commission_rate: p.commission_rate,
        notes: p.notes
      }));

      await updateService({
        name: serviceName,
        duration: parseInt(duration),
        buffer_time: parseInt(buffer),
        price: parseFloat(price),
        currency: service.currency,
        organization: service.organization,
        selected_providers: selectedProviders,
        description: description,
      });

      refreshService();
      navigate('/settings/services');
    } catch (error: any) {
      alert(error?.message || 'Failed to update service. Please try again.');
    }
  };

  const handleRemoveProvider = async (providerName: string) => {
    if (!serviceId || !confirm(`Remove ${providers.find(p => p.name === providerName)?.provider_name} from this service?`)) {
      return;
    }

    try {
      await removeProvider({
        service_id: serviceId,
        provider_id: providerName,
      });
      refreshService();
    } catch (error: any) {
      alert(error?.message || 'Failed to remove provider. Please try again.');
    }
  };

  if (loadingService) {
    return (
      <div
        className="min-h-screen text-[var(--text-primary)] flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Spinner />
      </div>
    );
  }

  if (!service) {
    return (
      <div
        className="min-h-screen text-[var(--text-primary)]"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card
            className="p-6 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="text-center">
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Service not found</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/settings/services')}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden mx-auto"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                <span className="relative z-10">Back to Services</span>
              </motion.button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/settings/services')}
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
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Service</h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>{service.service_name}</p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={updating}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                {updating ? (
                  <>
                    <Loader2 className="relative z-10 w-4 h-4 animate-spin" />
                    <span className="relative z-10">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="relative z-10 w-4 h-4" />
                    <span className="relative z-10">Save Changes</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Service Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Service Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="serviceName" style={{ color: 'var(--text-primary)' }}>Service Name *</Label>
                    <Input
                      id="serviceName"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g., General Consultation"
                      className="mt-1"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" style={{ color: 'var(--text-primary)' }}>Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this service..."
                      className="mt-1"
                      rows={3}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="duration" style={{ color: 'var(--text-primary)' }}>Duration (minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="5"
                        step="5"
                        className="mt-1"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price" style={{ color: 'var(--text-primary)' }}>Price (ETB)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        className="mt-1"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="buffer" style={{ color: 'var(--text-primary)' }}>Buffer Time (minutes)</Label>
                      <Input
                        id="buffer"
                        type="number"
                        value={buffer}
                        onChange={(e) => setBuffer(e.target.value)}
                        min="0"
                        className="mt-1"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Service Providers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Service Providers</h2>
                  {service.organization && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLinkProviderModalOpen(true)}
                      className="relative group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                      <UserPlus className="relative z-10 w-4 h-4" />
                      <span className="relative z-10">Link Provider</span>
                    </motion.button>
                  )}
                </div>

                {providers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No providers linked to this service</p>
                    {service.organization && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLinkProviderModalOpen(true)}
                        className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden mx-auto"
                      >
                        <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                        <UserPlus className="relative z-10 w-4 h-4" />
                        <span className="relative z-10">Link Providers</span>
                      </motion.button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {providers.map((provider) => (
                      <div
                        key={provider.name}
                        className="flex items-center justify-between p-4 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-default)'
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {provider.provider_name}
                            </h3>
                            {provider.is_primary && (
                              <span
                                className="px-2 py-0.5 text-xs rounded"
                                style={{
                                  backgroundColor: 'var(--accent-primary-light)',
                                  color: 'var(--accent-primary)'
                                }}
                              >
                                Primary
                              </span>
                            )}
                            <span
                              className="px-2 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: provider.status === 'Active' ? 'var(--accent-success-light)' : 'var(--border-subtle)',
                                color: provider.status === 'Active' ? 'var(--accent-success)' : 'var(--text-muted)'
                              }}
                            >
                              {provider.status}
                            </span>
                          </div>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{provider.email}</p>
                          {provider.price_override && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                              Price Override: {provider.price_override} ETB
                            </p>
                          )}
                          {provider.duration_override && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                              Duration Override: {provider.duration_override} min
                            </p>
                          )}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveProvider(provider.name)}
                          disabled={removingProvider}
                          className="p-2 rounded-lg transition-colors"
                          style={{
                            backgroundColor: 'var(--border-subtle)',
                            color: 'var(--accent-secondary)'
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Link Provider Modal */}
      {service.organization && (
        <LinkProviderModal
          open={linkProviderModalOpen}
          onOpenChange={setLinkProviderModalOpen}
          serviceId={serviceId || ''}
          serviceName={service.service_name}
          organizationId={service.organization}
          onSuccess={() => {
            refreshService();
          }}
        />
      )}
    </div>
  );
};

export default EditService;



