import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';

interface Step3OrgAvailabilityProps {
  onNext: () => void;
  onBack: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

const Step3OrgAvailability = ({ onNext, onBack }: Step3OrgAvailabilityProps) => {
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.save_organization_availability');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Quick templates
  const applyTemplate = (template: 'work' | 'flexible' | 'weekend') => {
    let newSchedule: WeeklySchedule = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    if (template === 'work') {
      // 9-5 Mon-Fri
      const workSlot = [{ start: '09:00', end: '17:00' }];
      newSchedule = {
        monday: workSlot,
        tuesday: workSlot,
        wednesday: workSlot,
        thursday: workSlot,
        friday: workSlot,
        saturday: [],
        sunday: [],
      };
    } else if (template === 'flexible') {
      // 9-6 Mon-Sat
      const flexSlot = [{ start: '09:00', end: '18:00' }];
      newSchedule = {
        monday: flexSlot,
        tuesday: flexSlot,
        wednesday: flexSlot,
        thursday: flexSlot,
        friday: flexSlot,
        saturday: flexSlot,
        sunday: [],
      };
    } else if (template === 'weekend') {
      // Sat-Sun only
      const weekendSlot = [{ start: '10:00', end: '18:00' }];
      newSchedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: weekendSlot,
        sunday: weekendSlot,
      };
    }

    setSchedule(newSchedule);
  };

  const toggleDay = (day: keyof WeeklySchedule) => {
    setSchedule((prev) => {
      if (prev[day].length > 0) {
        // Remove all slots
        return { ...prev, [day]: [] };
      } else {
        // Add default slot
        return { ...prev, [day]: [{ start: '09:00', end: '17:00' }] };
      }
    });
  };

  const updateSlot = (day: keyof WeeklySchedule, index: number, field: 'start' | 'end', value: string) => {
    setSchedule((prev) => {
      const newSlots = [...prev[day]];
      newSlots[index] = { ...newSlots[index], [field]: value };
      return { ...prev, [day]: newSlots };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!locationName || locationName.trim().length < 3) {
      newErrors.locationName = 'Location name must be at least 3 characters';
    }

    // Check if at least one day has slots
    const hasSlots = Object.values(schedule).some((slots) => slots.length > 0);
    if (!hasSlots) {
      newErrors.schedule = 'Please set business hours for at least one day';
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
        location_name: locationName,
        address,
        weekly_schedule: schedule,
      });

      onNext();
    } catch (error) {
      console.error('Failed to save availability:', error);
      setErrors({
        submit: 'Failed to save business hours. Please try again.',
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Business Hours
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set your organization's operating hours
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Location Info */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="locationName">
              Location Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="locationName"
              type="text"
              placeholder="e.g., Main Branch"
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                if (errors.locationName) setErrors({ ...errors, locationName: '' });
              }}
              className={errors.locationName ? 'border-red-500' : ''}
            />
            {errors.locationName && (
              <p className="text-sm text-red-500">{errors.locationName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Address (Optional)
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="e.g., 123 Main Street, Addis Ababa"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Templates */}
        <div className="space-y-3">
          <Label>Quick Templates</Label>
          <div className="flex gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('work')}
            >
              9-5 (Mon-Fri)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('flexible')}
            >
              9-6 (Mon-Sat)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('weekend')}
            >
              Weekend Only
            </Button>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-3">
          <Label>Weekly Schedule</Label>
          {errors.schedule && (
            <p className="text-sm text-red-500">{errors.schedule}</p>
          )}
          <div className="space-y-2">
            {days.map((day, dayIndex) => {
              const isActive = schedule[day as keyof WeeklySchedule].length > 0;
              return (
                <div
                  key={day}
                  className={`p-4 border rounded-lg transition-colors ${
                    isActive
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleDay(day as keyof WeeklySchedule)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isActive
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isActive && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-left">
                        {dayLabels[dayIndex]}
                      </span>
                    </button>
                    {isActive && (
                      <div className="flex items-center gap-2">
                        {schedule[day as keyof WeeklySchedule].map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateSlot(day as keyof WeeklySchedule, slotIndex, 'start', e.target.value)
                              }
                              className="w-32 text-sm"
                            />
                            <span className="text-gray-500">-</span>
                            <Input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateSlot(day as keyof WeeklySchedule, slotIndex, 'end', e.target.value)
                              }
                              className="w-32 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Next: Create Services'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step3OrgAvailability;



