import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { StepLayout } from './StepLayout';
import { SearchableSelect } from './SearchableSelect';
import { User } from 'lucide-react';

interface Step1ProfileProps {
  onNext: () => void;
}

const Step1Profile = ({ onNext }: Step1ProfileProps) => {
  const { t } = useTranslation();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [language, setLanguage] = useState('en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { call, loading } = useFrappePostCall('appointment.onboarding.save_profile');

  const businessTypes = [
    { value: 'clinic', label: 'Clinic/Hospital' },
    { value: 'salon', label: 'Salon/Spa' },
    { value: 'university', label: 'University/School' },
    { value: 'legal', label: 'Legal/Consulting' },
    { value: 'other', label: 'Other' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'am', label: 'አማርኛ (Amharic)' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!businessName || businessName.trim().length < 3) {
      newErrors.businessName = 'Business name must be at least 3 characters';
    }

    if (!businessType) {
      newErrors.businessType = 'Please select a business type';
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
        business_name: businessName,
        business_type: businessType,
        timezone,
        language,
      });

      onNext();
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors({
        submit: 'Failed to save profile. Please try again.',
      });
    }
  };

  return (
    <StepLayout
      icon={User}
      title="Business Profile"
      description="Tell us about your business"
    >
      <div className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">
            Business Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="businessName"
            type="text"
            placeholder="e.g., Amara Clinic"
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              if (errors.businessName) setErrors({ ...errors, businessName: '' });
            }}
            className={errors.businessName ? 'border-red-500' : ''}
          />
          {errors.businessName && (
            <p className="text-sm text-red-500">{errors.businessName}</p>
          )}
        </div>

        {/* Business Type */}
        <div className="space-y-2">
          <Label htmlFor="businessType">
            Business Type <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            value={businessType}
            onChange={(value) => {
              setBusinessType(value);
              if (errors.businessType) setErrors({ ...errors, businessType: '' });
            }}
            options={businessTypes}
            placeholder="Search business type"
            emptyMessage="No business types found"
          />
          {errors.businessType && (
            <p className="text-sm text-red-500">{errors.businessType}</p>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">
            Timezone
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="bg-white dark:bg-gray-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Africa/Addis_Ababa">East Africa Time (Addis Ababa)</SelectItem>
              <SelectItem value="Africa/Nairobi">East Africa Time (Nairobi)</SelectItem>
              <SelectItem value="Africa/Cairo">Eastern European Time (Cairo)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will be used for appointment scheduling
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language">
            Preferred Language
          </Label>
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

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Next Button */}
        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto px-6">
          {loading ? 'Saving...' : 'Next: Connect Calendar'}
        </Button>
      </div>
    </StepLayout>
  );
};

export default Step1Profile;
