import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Card } from '@/components/card';
import { ArrowLeft, Plus, Users, Trash2, Mail, Phone } from 'lucide-react';

interface Step2OrgProvidersProps {
  onNext: () => void;
  onBack: () => void;
}

interface Provider {
  name: string;
  provider_name: string;
  user: string;
  phone: string;
  organization_status: string;
}

const Step2OrgProviders = ({ onNext, onBack }: Step2OrgProvidersProps) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { call: addProvider, loading: adding } = useFrappePostCall('frappe_appointment.onboarding.add_organization_provider');
  const { data: providersData, mutate: refreshProviders, isLoading: loadingProviders } = useFrappeGetCall<{ success: boolean; providers: Provider[] }>(
    'frappe_appointment.onboarding.get_organization_providers',
    undefined,
    undefined,
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (providersData?.message?.providers) {
      setProviders(providersData.message.providers);
    } else if (providersData?.providers) {
      setProviders(providersData.providers);
    }
  }, [providersData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!providerName || providerName.trim().length < 3) {
      newErrors.providerName = 'Provider name must be at least 3 characters';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phone || phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProvider = async () => {
    if (!validate()) {
      return;
    }

    try {
      const result = await addProvider({
        provider_name: providerName,
        email,
        phone,
        specialization,
        invite_existing: false,
      });

      // Check if successful
      if (result?.message?.success !== false) {
        // Show success message
        const addedName = result?.message?.provider_name || providerName;
        setSuccessMessage(`${addedName} has been added successfully!`);
        
        // Clear form
        setProviderName('');
        setEmail('');
        setPhone('');
        setSpecialization('');
        setShowAddForm(false);
        setErrors({});

        // Refresh providers list - force revalidation
        await refreshProviders();
        
        // Also manually update the list if refresh doesn't work immediately
        // This ensures the UI updates right away
        setTimeout(async () => {
          await refreshProviders();
        }, 100);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrors({
          submit: result?.message?.error || 'Failed to add provider. Please try again.',
        });
      }
    } catch (error: any) {
      console.error('Failed to add provider:', error);
      setErrors({
        submit: error?.message || 'Failed to add provider. Please try again.',
      });
    }
  };

  const handleNext = () => {
    if (providers.length === 0) {
      setErrors({
        submit: 'Please add at least one provider to continue.',
      });
      return;
    }
    onNext();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Providers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add team members who will provide services
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Loading State */}
        {loadingProviders && providers.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Loading providers...</p>
          </div>
        )}

        {/* Providers List */}
        {providers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Providers ({providers.length})
            </h3>
            {providers.map((provider) => (
              <Card key={provider.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {provider.provider_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {provider.provider_name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {provider.user}
                        </div>
                        {provider.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {provider.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    {provider.organization_status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Provider Button/Form */}
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full border-dashed border-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        ) : (
          <Card className="p-6 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add New Provider
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="providerName">
                  Provider Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="providerName"
                  type="text"
                  placeholder="e.g., Dr. Sarah Johnson"
                  value={providerName}
                  onChange={(e) => {
                    setProviderName(e.target.value);
                    if (errors.providerName) setErrors({ ...errors, providerName: '' });
                  }}
                  className={errors.providerName ? 'border-red-500' : ''}
                />
                {errors.providerName && (
                  <p className="text-sm text-red-500">{errors.providerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="provider@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+251911234567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">
                  Specialization (Optional)
                </Label>
                <Input
                  id="specialization"
                  type="text"
                  placeholder="e.g., General Practitioner"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setProviderName('');
                    setEmail('');
                    setPhone('');
                    setSpecialization('');
                    setErrors({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProvider}
                  disabled={adding}
                  className="flex-1"
                >
                  {adding ? 'Adding...' : 'Add Provider'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {providers.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No providers added yet</p>
            <p className="text-xs">Click "Add Provider" to get started</p>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && !showAddForm && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={providers.length === 0}
          >
            Next: Set Business Hours
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step2OrgProviders;


