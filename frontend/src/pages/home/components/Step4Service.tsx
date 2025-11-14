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
import { ArrowLeft } from 'lucide-react';

interface Step4ServiceProps {
  onNext: () => void;
  onBack: () => void;
}

const Step4Service = ({ onNext, onBack }: Step4ServiceProps) => {
  const { t } = useTranslation();
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('30');
  const [bufferTime, setBufferTime] = useState('5');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingUrl, setBookingUrl] = useState('');

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.create_service');

  const durations = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '60 minutes' },
  ];

  const bufferTimes = [
    { value: '0', label: 'No buffer' },
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!serviceName || serviceName.trim().length < 3) {
      newErrors.serviceName = t('validation.serviceNameRequired') || 'Service name must be at least 3 characters';
    }

    if (price && isNaN(Number(price))) {
      newErrors.price = t('validation.invalidPrice') || 'Please enter a valid price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      const result = await call({
        name: serviceName,
        duration: parseInt(duration),
        buffer_time: parseInt(bufferTime),
        price: price ? parseFloat(price) : 0,
        currency: 'ETB',
      });

      if (result?.message?.booking_url) {
        setBookingUrl(result.message.booking_url);
      }

      onNext();
    } catch (error) {
      console.error('Failed to create service:', error);
      setErrors({
        submit: t('error.saveFailed') || 'Failed to create service. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="space-y-6">
          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="serviceName">
              {t('onboarding.step4.serviceName') || 'Service Name'} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serviceName"
              type="text"
              placeholder={t('onboarding.step4.serviceNamePlaceholder') || 'e.g., General Consultation'}
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                if (errors.serviceName) setErrors({ ...errors, serviceName: '' });
              }}
              className={errors.serviceName ? 'border-red-500' : ''}
            />
            {errors.serviceName && (
              <p className="text-sm text-red-500">{errors.serviceName}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.step4.serviceNameHelp') || 'What service do you offer?'}
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              {t('onboarding.step4.duration') || 'Duration'} <span className="text-red-500">*</span>
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.step4.durationHelp') || 'How long does each appointment take?'}
            </p>
          </div>

          {/* Buffer Time */}
          <div className="space-y-2">
            <Label htmlFor="bufferTime">
              {t('onboarding.step4.bufferTime') || 'Buffer Time'}
            </Label>
            <Select value={bufferTime} onValueChange={setBufferTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bufferTimes.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.step4.bufferTimeHelp') || 'Gap between appointments (for cleanup, prep time)'}
            </p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              {t('onboarding.step4.price') || 'Price'} ({t('currency.etb') || 'ETB'})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                ብር
              </span>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                placeholder="500"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors({ ...errors, price: '' });
                }}
                className={`pl-10 ${errors.price ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.step4.priceHelp') || 'Leave empty if free. You can add payment later.'}
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Preview */}
          {serviceName && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('onboarding.step4.preview') || 'Preview:'}
              </p>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {serviceName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {duration} min • {bufferTime > '0' ? `${bufferTime} min buffer` : 'No buffer'}
                {price && ` • ${price} ETB`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back') || 'Back'}</span>
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading || !serviceName}
          className="bg-gradient-hero hover:opacity-90 text-white"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{t('common.creating') || 'Creating...'}</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <span>{t('common.createAndContinue') || 'Create & Continue'}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Step4Service;

