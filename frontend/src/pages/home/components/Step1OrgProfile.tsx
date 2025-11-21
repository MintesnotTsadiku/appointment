import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Building2, Plus } from 'lucide-react';
import { StepLayout } from './StepLayout';
import { SearchableSelect } from './SearchableSelect';
import type { Organization } from '@/context/onboarding/types';
import { useOnboarding } from '@/context/onboarding';

interface Step1OrgProfileProps {
  onNext: () => void;
}

const Step1OrgProfile = ({ onNext }: Step1OrgProfileProps) => {
  const { progress } = useOnboarding();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('new');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.save_organization_profile');
  const { data: orgsData, isLoading: loadingOrgs } = useFrappeGetCall<{ 
    success: boolean; 
    organizations: Organization[] 
  }>('frappe_appointment.onboarding.get_user_organizations');

  const organizationTypes = [
    { value: 'Healthcare', label: 'Healthcare Clinic' },
    { value: 'Salon & Spa', label: 'Salon & Spa' },
    { value: 'Fitness & Wellness', label: 'Fitness & Wellness' },
    { value: 'Consulting', label: 'Consulting' },
    { value: 'Education', label: 'Education' },
    { value: 'Legal', label: 'Legal' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Other', label: 'Other' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'am', label: 'አማርኛ (Amharic)' },
  ];

  // Get available organizations
  const organizations = orgsData?.message?.organizations || orgsData?.organizations || [];

  // Load selected organization on mount if coming back to this step
  useEffect(() => {
    if (progress?.selected_organization?.id && organizations.length > 0) {
      setSelectedOrgId(progress.selected_organization.id);
    }
  }, [progress, organizations]);

  // Load organization data when selection changes
  useEffect(() => {
    if (selectedOrgId && selectedOrgId !== 'new') {
      const org = organizations.find(o => o.name === selectedOrgId);
      if (org) {
        setOrganizationName(org.organization_name);
        setOrganizationType(org.organization_type);
        setEmail(org.email);
        setPhone(org.phone);
        setTimezone(org.timezone);
        setLanguage(org.language);
        setDescription(org.description || '');
      }
    } else if (selectedOrgId === 'new') {
      // Reset form for new organization
      setOrganizationName('');
      setOrganizationType('');
      setEmail('');
      setPhone('');
      setTimezone('Africa/Addis_Ababa');
      setLanguage('en');
      setDescription('');
    }
  }, [selectedOrgId, organizations]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!organizationName || organizationName.trim().length < 3) {
      newErrors.organizationName = 'Organization name must be at least 3 characters';
    }

    if (!organizationType) {
      newErrors.organizationType = 'Please select an organization type';
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

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await call({
        organization_name: organizationName,
        organization_type: organizationType,
        email,
        phone,
        timezone,
        language,
        description,
        organization_id: selectedOrgId !== 'new' ? selectedOrgId : null,
      });

      onNext();
    } catch (error) {
      console.error('Failed to save organization profile:', error);
      setErrors({
        submit: 'Failed to save organization profile. Please try again.',
      });
    }
  };

  return (
    <StepLayout
      icon={Building2}
      title="Organization Profile"
      description="Tell us about your organization"
    >
      <div className="space-y-6">
        {/* Organization Selector */}
        {organizations.length > 0 && (
          <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
            <Label htmlFor="orgSelector">Select Organization</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="bg-white dark:bg-gray-950">
                <SelectValue placeholder="Choose existing or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Create New Organization</span>
                  </div>
                </SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.name} value={org.name}>
                    {org.organization_name} {org.role && `(${org.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOrgId !== 'new' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Editing existing organization. Changes will be saved.
              </p>
            )}
          </div>
        )}

        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="organizationName">
            Organization Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="organizationName"
            type="text"
            placeholder="e.g., Mahlet Clinic"
            value={organizationName}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              if (errors.organizationName) setErrors({ ...errors, organizationName: '' });
            }}
            className={errors.organizationName ? 'border-red-500' : ''}
          />
          {errors.organizationName && (
            <p className="text-sm text-red-500">{errors.organizationName}</p>
          )}
        </div>

        {/* Organization Type */}
        <div className="space-y-2">
          <Label htmlFor="organizationType">
            Organization Type <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            value={organizationType}
            onChange={(value) => {
              setOrganizationType(value);
              if (errors.organizationType) setErrors({ ...errors, organizationType: '' });
            }}
            options={organizationTypes}
            placeholder="Search organization type"
            emptyMessage="No types found."
          />
          {errors.organizationType && (
            <p className="text-sm text-red-500">{errors.organizationType}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Contact Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@organization.com"
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

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-red-500">*</span>
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

        {/* Timezone & Language (side by side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-white dark:bg-gray-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Addis_Ababa">East Africa Time (Addis Ababa)</SelectItem>
                <SelectItem value="Africa/Nairobi">East Africa Time (Nairobi)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-white dark:bg-gray-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            placeholder="Brief description of your organization"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} disabled={loading} className="px-6">
            {loading ? 'Saving...' : 'Next: Add Providers'}
          </Button>
        </div>
      </div>
    </StepLayout>
  );
};

export default Step1OrgProfile;

