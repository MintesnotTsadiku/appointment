import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { StepLayout } from './StepLayout';

interface Step4ServiceProps {
  onNext: () => void;
  onBack: () => void;
}

const Step4Service = ({ onNext, onBack }: Step4ServiceProps) => {
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('30');
  const [bufferTime, setBufferTime] = useState('5');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingUrl, setBookingUrl] = useState('');

  const { call, loading } = useFrappePostCall('appointment.onboarding.create_service');

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
      newErrors.serviceName = 'Service name must be at least 3 characters';
    }

    if (price && isNaN(Number(price))) {
      newErrors.price = 'Please enter a valid price';
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
        submit: 'Failed to create service. Please try again.',
      });
    }
  };

  return (
    <StepLayout
      icon={Briefcase}
      title="Create Service"
      description="Set up your first appointment type"
      footer={
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !serviceName}>
            {loading ? 'Creating...' : 'Create & Continue'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Service Name */}
        <div className="space-y-2">
          <Label htmlFor="serviceName">
            Service Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="serviceName"
            type="text"
            placeholder="e.g., General Consultation"
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              if (errors.serviceName) setErrors({ ...errors, serviceName: '' });
            }}
            className={errors.serviceName ? 'border-red-500' : ''}
          />
          {errors.serviceName && <p className="text-sm text-red-500">{errors.serviceName}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400">What service do you offer?</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration <span className="text-red-500">*</span></Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="bg-white dark:bg-gray-950">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">How long does each appointment take?</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bufferTime">Buffer Time</Label>
          <Select value={bufferTime} onValueChange={setBufferTime}>
            <SelectTrigger className="bg-white dark:bg-gray-950">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Gap between appointments (for cleanup, prep time)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (ETB)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">ብር</span>
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
          {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400">Leave empty if free. You can add payment later.</p>
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {serviceName && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{serviceName}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {duration} min • {bufferTime > '0' ? `${bufferTime} min buffer` : 'No buffer'}
              {price && ` • ${price} ETB`}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={onNext}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </StepLayout>
  );
};

export default Step4Service;
