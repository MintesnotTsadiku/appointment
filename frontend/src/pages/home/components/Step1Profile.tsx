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

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.save_profile');

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
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
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger className={errors.businessType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <SelectTrigger>
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

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Next Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-hero hover:opacity-90 text-white text-lg py-6"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              Continue
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Step1Profile;

