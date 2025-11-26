import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/button';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';

interface LinkProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  serviceName: string;
  organizationId: string | null;
  onSuccess?: () => void;
}

interface Provider {
  name: string;
  provider_name: string;
  email: string;
  phone?: string;
  is_primary_org?: boolean;
}

export const LinkProviderModal = ({
  open,
  onOpenChange,
  serviceId,
  serviceName,
  organizationId,
  onSuccess,
}: LinkProviderModalProps) => {
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isPrimary, setIsPrimary] = useState<Record<string, boolean>>({});

  // Fetch available providers
  const { data: providersData, mutate: refreshProviders, isLoading: loadingProviders } = useFrappeGetCall<{
    message: { success: boolean; providers: Provider[]; error?: string };
  }>(
    'frappe_appointment.onboarding.get_available_providers_for_service',
    serviceId && organizationId ? { service_id: serviceId, organization_id: organizationId } : undefined,
    `available-providers-${serviceId}-${organizationId}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { call: linkProvider, loading: linking } = useFrappePostCall('frappe_appointment.onboarding.link_provider_to_service');

  const providers = providersData?.message?.providers || [];

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedProviders([]);
      setIsPrimary({});
      refreshProviders();
    }
  }, [open, serviceId, organizationId]);

  const handleLinkProviders = async () => {
    if (!serviceId || selectedProviders.length === 0) return;

    try {
      // Link each selected provider
      const linkPromises = selectedProviders.map((providerId) =>
        linkProvider({
          service_id: serviceId,
          provider_id: providerId,
          is_primary: isPrimary[providerId] || false,
        })
      );

      await Promise.all(linkPromises);

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking providers:', error);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Link Providers to Service
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {serviceName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingProviders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                ) : providers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      All providers in this organization are already linked to this service.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select providers to link to this service. You can mark one as primary.
                    </p>
                    {providers.map((provider) => (
                      <div
                        key={provider.name}
                        className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <Checkbox
                          id={`provider-${provider.name}`}
                          checked={selectedProviders.includes(provider.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProviders([...selectedProviders, provider.name]);
                            } else {
                              setSelectedProviders(selectedProviders.filter((p) => p !== provider.name));
                              setIsPrimary({ ...isPrimary, [provider.name]: false });
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`provider-${provider.name}`}
                            className="font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            {provider.provider_name}
                            {provider.is_primary_org && (
                              <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(Primary in Org)</span>
                            )}
                          </Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{provider.email}</p>
                          {provider.phone && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{provider.phone}</p>
                          )}
                        </div>
                        {selectedProviders.includes(provider.name) && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`primary-${provider.name}`}
                              checked={isPrimary[provider.name] || false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Uncheck all other primaries
                                  const newIsPrimary: Record<string, boolean> = {};
                                  Object.keys(isPrimary).forEach((key) => {
                                    newIsPrimary[key] = false;
                                  });
                                  newIsPrimary[provider.name] = true;
                                  setIsPrimary(newIsPrimary);
                                } else {
                                  setIsPrimary({ ...isPrimary, [provider.name]: false });
                                }
                              }}
                            />
                            <Label
                              htmlFor={`primary-${provider.name}`}
                              className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                            >
                              Primary
                            </Label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkProviders}
                  disabled={selectedProviders.length === 0 || linking}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {linking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Link {selectedProviders.length > 0 ? `${selectedProviders.length} ` : ''}Provider
                      {selectedProviders.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};



