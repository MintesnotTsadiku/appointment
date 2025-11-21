import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { StepLayout } from './StepLayout';

interface Step3AvailabilityProps {
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

const Step3Availability = ({ onNext, onBack }: Step3AvailabilityProps) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.save_availability');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

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

  const isTimeSlotSelected = (day: string, hour: number): boolean => {
    const daySchedule = schedule[day as keyof WeeklySchedule];
    if (!daySchedule || daySchedule.length === 0) return false;

    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
    return daySchedule.some((slot) => {
      const slotStart = parseInt(slot.start.split(':')[0]);
      const slotEnd = parseInt(slot.end.split(':')[0]);
      return hour >= slotStart && hour < slotEnd;
    });
  };

  const toggleTimeSlot = (day: string, hour: number) => {
    const dayKey = day as keyof WeeklySchedule;
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
    const nextHourStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

    const currentSchedule = [...schedule[dayKey]];
    const isSelected = isTimeSlotSelected(day, hour);

    if (isSelected) {
      // Remove this hour
      const newSchedule = currentSchedule.filter((slot) => {
        const slotStart = parseInt(slot.start.split(':')[0]);
        const slotEnd = parseInt(slot.end.split(':')[0]);
        return !(hour >= slotStart && hour < slotEnd);
      });
      setSchedule({ ...schedule, [dayKey]: newSchedule });
    } else {
      // Add this hour - try to merge with adjacent slots
      const newSlot = { start: hourStr, end: nextHourStr };
      const merged = mergeTimeSlots([...currentSchedule, newSlot]);
      setSchedule({ ...schedule, [dayKey]: merged });
    }
  };

  const mergeTimeSlots = (slots: TimeSlot[]): TimeSlot[] => {
    if (slots.length === 0) return [];

    // Sort by start time
    const sorted = slots.sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    const merged: TimeSlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        // Overlapping or adjacent, merge
        last.end = current.end > last.end ? current.end : last.end;
      } else {
        merged.push(current);
      }
    }

    return merged;
  };

  const handleSubmit = async () => {
    // Check if at least one day has availability
    const hasAvailability = Object.values(schedule).some((slots) => slots.length > 0);
    if (!hasAvailability) {
      alert('Please set at least one available time slot');
      return;
    }

    try {
      await call({ weekly_schedule: schedule });
      onNext();
    } catch (error) {
      console.error('Failed to save availability:', error);
    }
  };

  return (
    <StepLayout
      icon={Clock3}
      title="Set Availability"
      description="Choose when you're available for appointments"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Templates
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => applyTemplate('work')}>
              9-5 Mon-Fri
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('flexible')}>
              9-6 Mon-Sat
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('weekend')}>
              Weekend Only
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Click to toggle availability</h3>
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Time</th>
                  {dayLabels.map((day) => (
                    <th key={day} className="p-2 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td className="p-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </td>
                    {days.map((day) => (
                      <td key={`${day}-${hour}`} className="p-1">
                        <button
                          onClick={() => toggleTimeSlot(day, hour)}
                          className={`w-12 h-12 rounded-lg transition-all ${
                            isTimeSlotSelected(day, hour)
                              ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          aria-label={`Toggle ${day} at ${hour}:00`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Click and drag to select multiple hours</p>
        </div>
      </div>
    </StepLayout>
  );
};

export default Step3Availability;
