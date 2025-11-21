import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { StepLayout } from './StepLayout';
import { ArrowLeft, Plus, Users, Mail, Phone, Link as LinkIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import type { Provider, Organization } from '@/context/onboarding/types';
import { useOnboarding } from '@/context/onboarding';

interface Step2OrgProvidersProps {
  onNext: () => void;
  onBack: () => void;
}

const Step2OrgProviders = ({ onNext, onBack }: Step2OrgProvidersProps) => {
  const { progress } = useOnboarding();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { call: addProvider, loading: adding } = useFrappePostCall('frappe_appointment.onboarding.add_organization_provider');
  const { data: providersData, mutate: refreshProviders, isLoading: loadingProviders } = useFrappeGetCall<{ success: boolean; providers: Provider[] }>(
    'frappe_appointment.onboarding.get_organization_providers',
    selectedOrgId ? { organization_id: selectedOrgId } : undefined,
    `org-providers-${selectedOrgId}`,
    {
      revalidateOnFocus: false,
    }
  );
  
  // Get list of organizations for selection
  const { data: orgsData } = useFrappeGetCall<{ success: boolean; organizations: Organization[] }>(
    'frappe_appointment.onboarding.get_user_organizations'
  );
  
  // Get available providers to link
  const { data: availableProvidersData } = useFrappeGetCall<{ success: boolean; providers: Provider[] }>(
    'frappe_appointment.onboarding.search_user_providers'
  );
  
  const organizations = orgsData?.message?.organizations || orgsData?.organizations || [];
  const availableProviders = availableProvidersData?.message?.providers || availableProvidersData?.providers || [];
  
  // Filter out providers already in this organization
  const linkableProviders = availableProviders.filter(p => p.organization !== selectedOrgId);

  // Set selected organization from context on mount
  useEffect(() => {
    if (progress?.selected_organization?.id) {
      setSelectedOrgId(progress.selected_organization.id);
    }
  }, [progress]);

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

  const handleLinkExistingProvider = async () => {
    if (!selectedProviderId) {
      setErrors({ submit: 'Please select a provider to link' });
      return;
    }

    try {
      const result = await addProvider({
        existing_provider_id: selectedProviderId,
        invite_existing: true,
        organization_id: selectedOrgId,
        provider_name: '', // Not needed for linking
        email: '', // Not needed for linking
      });

      if (result?.message?.success !== false) {
        const provider = availableProviders.find(p => p.name === selectedProviderId);
        setSuccessMessage(`${provider?.provider_name || 'Provider'} has been linked successfully!`);
        setSelectedProviderId('');
        setIsLinkingMode(false);
        setErrors({});
        await refreshProviders();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ submit: result?.message?.error || 'Failed to link provider. Please try again.' });
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to link provider. Please try again.' });
    }
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
        organization_id: selectedOrgId,
      });

      if (result?.message?.success !== false) {
        setSuccessMessage(`${result?.message?.provider_name || providerName} has been added successfully!`);
        setProviderName('');
        setEmail('');
        setPhone('');
        setSpecialization('');
        setShowAddForm(false);
        setErrors({});
        await refreshProviders();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ submit: result?.message?.error || 'Failed to add provider. Please try again.' });
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to add provider. Please try again.' });
    }
  };

  const handleNext = () => {
    if (providers.length === 0) {
      setErrors({ submit: 'Please add at least one provider to continue.' });
      return;
    }
    onNext();
  };

  return (
    <StepLayout
      icon={Users}
      title="Add Providers"
      description="Add team members who will provide services"
      footer={
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleNext} disabled={providers.length === 0}>
            Next: Set Business Hours
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Organization Selector */}
        {organizations.length > 1 && (
          <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
            <Label htmlFor="orgSelector">Organization</Label>
            <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="bg-white dark:bg-gray-950">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.name} value={org.name}>
                    {org.organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Managing providers for this organization
            </p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {loadingProviders && providers.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Loading providers...</p>
          </div>
        )}

        {providers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Providers ({providers.length})
            </h3>
            {providers.map((provider) => (
              <div key={provider.name} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-200 flex items-center justify-center font-semibold">
                      {provider.provider_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{provider.provider_name}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {provider.user}
                        </span>
                        {provider.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {provider.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-semibold">
                    {provider.organization_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link Existing Provider */}
        {isLinkingMode && linkableProviders.length > 0 ? (
          <div className="p-4 border border-dashed border-primary-300 dark:border-primary-700 rounded-2xl bg-primary-50 dark:bg-primary-900/10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Link Existing Provider</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="existingProvider">Select Provider</Label>
                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger className="bg-white dark:bg-gray-950">
                    <SelectValue placeholder="Choose a provider to link" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkableProviders.map((prov) => (
                      <SelectItem key={prov.name} value={prov.name}>
                        <div className="flex flex-col">
                          <span>{prov.provider_name}</span>
                          <span className="text-xs text-gray-500">
                            {prov.user} {prov.organization_name && `• Currently: ${prov.organization_name}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Link an existing provider to this organization
                </p>
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
                    setIsLinkingMode(false);
                    setSelectedProviderId('');
                    setErrors({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleLinkExistingProvider} disabled={adding || !selectedProviderId} className="flex-1">
                  {adding ? 'Linking...' : 'Link Provider'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Add Provider */}
        {showAddForm ? (
          <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="providerName">Provider Name <span className="text-red-500">*</span></Label>
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
                {errors.providerName && <p className="text-sm text-red-500">{errors.providerName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
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
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization (Optional)</Label>
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
                <Button onClick={handleAddProvider} disabled={adding} className="flex-1">
                  {adding ? 'Adding...' : 'Add Provider'}
                </Button>
              </div>
            </div>
          </div>
        ) : !isLinkingMode ? (
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="flex-1 border-dashed border-2"
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Provider
            </Button>
            {linkableProviders.length > 0 && (
              <Button
                onClick={() => setIsLinkingMode(true)}
                variant="outline"
                className="flex-1 border-dashed border-2"
              >
                <LinkIcon className="w-4 h-4 mr-2" /> Link Existing Provider
              </Button>
            )}
          </div>
        ) : null}

        {providers.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No providers added yet</p>
            <p className="text-xs">Click "Add Provider" to get started</p>
          </div>
        )}

        {errors.submit && !showAddForm && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}
      </div>
    </StepLayout>
  );
};

export default Step2OrgProviders;
