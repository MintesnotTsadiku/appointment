import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, UserPlus, X, Check, Trash2 } from 'lucide-react';
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
    'frappe_appointment.onboarding.get_service_details',
    serviceId ? { service_id: serviceId } : undefined,
    `service-details-${serviceId}`,
    {
      revalidateOnFocus: false,
    }
  );

  const { call: updateService, loading: updating } = useFrappePostCall('frappe_appointment.onboarding.create_service');
  const { call: removeProvider, loading: removingProvider } = useFrappePostCall('frappe_appointment.onboarding.remove_provider_from_service');

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Service not found</p>
              <Button onClick={() => navigate('/settings/services')}>Back to Services</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings/services')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Service</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{service.service_name}</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={updating} className="flex items-center gap-2">
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Service Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g., General Consultation"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this service..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="5"
                    step="5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (ETB)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="buffer">Buffer Time (minutes)</Label>
                  <Input
                    id="buffer"
                    type="number"
                    value={buffer}
                    onChange={(e) => setBuffer(e.target.value)}
                    min="0"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Service Providers */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Providers</h2>
              {service.organization && (
                <Button
                  size="sm"
                  onClick={() => setLinkProviderModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Link Provider
                </Button>
              )}
            </div>

            {providers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-4">No providers linked to this service</p>
                {service.organization && (
                  <Button
                    variant="outline"
                    onClick={() => setLinkProviderModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Link Providers
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {provider.provider_name}
                        </h3>
                        {provider.is_primary && (
                          <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded">
                            Primary
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            provider.status === 'Active'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {provider.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{provider.email}</p>
                      {provider.price_override && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Price Override: {provider.price_override} ETB
                        </p>
                      )}
                      {provider.duration_override && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Duration Override: {provider.duration_override} min
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProvider(provider.name)}
                      disabled={removingProvider}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

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



