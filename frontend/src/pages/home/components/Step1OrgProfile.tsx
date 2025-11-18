import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
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
import { Building2 } from 'lucide-react';

interface Step1OrgProfileProps {
  onNext: () => void;
}

const Step1OrgProfile = ({ onNext }: Step1OrgProfileProps) => {
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.save_organization_profile');

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Organization Profile
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tell us about your organization
          </p>
        </div>
      </div>

      <div className="space-y-6">
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
          <Select value={organizationType} onValueChange={setOrganizationType}>
            <SelectTrigger className={errors.organizationType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select organization type" />
            </SelectTrigger>
            <SelectContent>
              {organizationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
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
              <SelectTrigger>
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
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8"
          >
            {loading ? 'Saving...' : 'Next: Add Providers'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step1OrgProfile;



