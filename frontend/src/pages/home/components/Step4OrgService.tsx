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
import { ArrowLeft, Briefcase } from 'lucide-react';
import { StepLayout } from './StepLayout';

interface Step4OrgServiceProps {
  onNext: () => void;
  onBack: () => void;
}

const Step4OrgService = ({ onNext, onBack }: Step4OrgServiceProps) => {
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [providerAssignment, setProviderAssignment] = useState('round_robin');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { call, loading } = useFrappePostCall('appointment.onboarding.create_organization_service');

  const durations = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ];

  const providerAssignmentOptions = [
    { value: 'round_robin', label: 'Round-robin (Automatic)' },
    { value: 'customer_choice', label: 'Customer chooses provider' },
    { value: 'all', label: 'All providers' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!serviceName || serviceName.trim().length < 3) {
      newErrors.serviceName = 'Service name must be at least 3 characters';
    }

    if (!duration) {
      newErrors.duration = 'Please select a duration';
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
        service_name: serviceName,
        duration: parseInt(duration),
        price: price ? parseFloat(price) : 0,
        description,
        provider_assignment: providerAssignment,
        providers: ['all'],
      });

      if (result?.message?.success === false) {
        setErrors({ submit: result?.message?.error || 'Failed to create service. Please try again.' });
        return;
      }

      onNext();
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to create service. Please try again.' });
    }
  };

  return (
    <StepLayout
      icon={Briefcase}
      title="Create Service"
      description="Define a service your organization offers"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Next: Get Booking Links'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
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
          {errors.serviceName && (
            <p className="text-sm text-red-500">{errors.serviceName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">
              Duration <span className="text-red-500">*</span>
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className={errors.duration ? 'border-red-500' : 'bg-white dark:bg-gray-950'}>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durations.map((dur) => (
                  <SelectItem key={dur.value} value={dur.value}>
                    {dur.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.duration && (
              <p className="text-sm text-red-500">{errors.duration}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (ETB, Optional)</Label>
            <Input
              id="price"
              type="number"
              placeholder="500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="providerAssignment">Provider Assignment</Label>
          <Select value={providerAssignment} onValueChange={setProviderAssignment}>
            <SelectTrigger className="bg-white dark:bg-gray-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerAssignmentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {providerAssignment === 'round_robin' && 'Bookings will be automatically distributed fairly across providers.'}
            {providerAssignment === 'customer_choice' && 'Customers will choose their preferred provider.'}
            {providerAssignment === 'all' && 'All providers will be available for this service.'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the service"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> You can add more services later from your dashboard.
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}
      </div>
    </StepLayout>
  );
};

export default Step4OrgService;
