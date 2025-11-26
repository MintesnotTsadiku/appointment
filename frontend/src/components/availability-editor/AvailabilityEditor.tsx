import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Trash2, X, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { TimeInput, type TimeFormat } from '@/components/time-input';

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface DaySchedule {
  day: string;
  ranges: TimeRange[];
  isOpen: boolean;
}

interface AvailabilityEditorProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  useDefaultHours?: boolean;
  onUseDefaultChange?: (useDefault: boolean) => void;
  parentSchedule?: DaySchedule[]; // For showing hierarchy (Service shows Location, Provider shows Service)
  level: 'location' | 'service' | 'provider';
  disabled?: boolean;
  timeFormat?: TimeFormat; // User's preferred time format
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AvailabilityEditor = ({
  schedule,
  onChange,
  useDefaultHours = false,
  onUseDefaultChange,
  parentSchedule,
  level,
  disabled = false,
  timeFormat = '12h',
}: AvailabilityEditorProps) => {
  const [localSchedule, setLocalSchedule] = useState<DaySchedule[]>(schedule);

  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  const handleDayToggle = (day: string) => {
    const updated = localSchedule.map((daySchedule) => {
      if (daySchedule.day === day) {
        return {
          ...daySchedule,
          isOpen: !daySchedule.isOpen,
          ranges: daySchedule.isOpen ? [] : [{ start: '08:30', end: '18:00' }],
        };
      }
      return daySchedule;
    });
    setLocalSchedule(updated);
    onChange(updated);
  };

  const handleAddRange = (day: string) => {
    const updated = localSchedule.map((daySchedule) => {
      if (daySchedule.day === day) {
        // Find the latest end time or use default
        const lastRange = daySchedule.ranges[daySchedule.ranges.length - 1];
        const defaultStart = lastRange ? lastRange.end : '08:30';
        const defaultEnd = '18:00';
        
        return {
          ...daySchedule,
          ranges: [...daySchedule.ranges, { start: defaultStart, end: defaultEnd }],
        };
      }
      return daySchedule;
    });
    setLocalSchedule(updated);
    onChange(updated);
  };

  const handleRemoveRange = (day: string, index: number) => {
    const updated = localSchedule.map((daySchedule) => {
      if (daySchedule.day === day) {
        return {
          ...daySchedule,
          ranges: daySchedule.ranges.filter((_, i) => i !== index),
        };
      }
      return daySchedule;
    });
    setLocalSchedule(updated);
    onChange(updated);
  };

  const handleRangeChange = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const updated = localSchedule.map((daySchedule) => {
      if (daySchedule.day === day) {
        const newRanges = [...daySchedule.ranges];
        newRanges[index] = { ...newRanges[index], [field]: value };
        return { ...daySchedule, ranges: newRanges };
      }
      return daySchedule;
    });
    setLocalSchedule(updated);
    onChange(updated);
  };

  const getParentRanges = (day: string): TimeRange[] => {
    if (!parentSchedule) return [];
    const parentDay = parentSchedule.find((d) => d.day === day);
    return parentDay?.ranges || [];
  };

  const isRangeWithinParent = (range: TimeRange, day: string): boolean => {
    const parentRanges = getParentRanges(day);
    if (parentRanges.length === 0) return true; // No parent constraints
    
    // Convert time string (HH:MM) to minutes for accurate comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const rangeStartMins = timeToMinutes(range.start);
    const rangeEndMins = timeToMinutes(range.end);
    
    // Check if range is completely within any parent range
    return parentRanges.some((parentRange) => {
      const parentStartMins = timeToMinutes(parentRange.start);
      const parentEndMins = timeToMinutes(parentRange.end);
      
      // Range must be completely within parent: start >= parentStart AND end <= parentEnd
      return rangeStartMins >= parentStartMins && rangeEndMins <= parentEndMins;
    });
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'location':
        return 'Location';
      case 'service':
        return 'Service';
      case 'provider':
        return 'Provider';
    }
  };

  const getLevelDescription = () => {
    switch (level) {
      case 'location':
        return 'Base availability for this location. All services and providers at this location must work within these hours.';
      case 'service':
        return 'Service-specific availability. Can restrict location hours (e.g., add lunch breaks). Must be within location hours.';
      case 'provider':
        return 'Your personal availability. Can restrict service/location hours. Must be within service and location hours.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Default Hours Toggle */}
      {onUseDefaultChange && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="use-default" className="text-sm font-semibold text-blue-900 dark:text-blue-300 cursor-pointer">
                  Using Default Hours
                </Label>
                <Checkbox
                  id="use-default"
                  checked={useDefaultHours}
                  onCheckedChange={(checked) => onUseDefaultChange(checked as boolean)}
                  disabled={disabled}
                />
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {useDefaultHours
                  ? `Using default hours (8:30 AM - 6:00 PM, Mon-Fri). Uncheck to customize and add breaks.`
                  : `Custom hours enabled. You can add multiple time ranges per day to create breaks (e.g., lunch break).`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Hierarchy Info */}
      {parentSchedule && parentSchedule.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
                {level === 'service' ? 'Location Hours' : 'Service/Location Hours'}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-400">
                Your {getLevelLabel().toLowerCase()} hours must be within the parent availability. 
                {level === 'service' && ' You can restrict location hours (e.g., add lunch breaks).'}
                {level === 'provider' && ' You can restrict service hours for your personal schedule.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Schedule Editor */}
      <div className="space-y-3">
        {daysOfWeek.map((day, dayIndex) => {
          const daySchedule = localSchedule.find((d) => d.day === day) || {
            day,
            ranges: [],
            isOpen: false,
          };
          const parentRanges = getParentRanges(day);

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.03 }}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start gap-4">
                {/* Day Toggle */}
                <div className="flex items-center space-x-3 min-w-[140px]">
                  <Checkbox
                    id={`day-${day}`}
                    checked={daySchedule.isOpen}
                    onCheckedChange={() => handleDayToggle(day)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`day-${day}`}
                    className="font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    {day}
                  </Label>
                </div>

                {/* Time Ranges */}
                <div className="flex-1 space-y-2">
                  {daySchedule.isOpen ? (
                    <>
                      {daySchedule.ranges.length > 0 ? (
                        <div className="space-y-2">
                          {daySchedule.ranges.map((range, rangeIndex) => {
                            const isValid = isRangeWithinParent(range, day);
                            return (
                              <div
                                key={rangeIndex}
                                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
                              >
                                <TimeInput
                                  value={range.start}
                                  onChange={(value) =>
                                    handleRangeChange(day, rangeIndex, 'start', value)
                                  }
                                  timeFormat={timeFormat}
                                  disabled={disabled}
                                  className={`w-32 ${!isValid ? 'border-red-500' : ''}`}
                                />
                                <span className="text-gray-500 dark:text-gray-400">to</span>
                                <TimeInput
                                  value={range.end}
                                  onChange={(value) =>
                                    handleRangeChange(day, rangeIndex, 'end', value)
                                  }
                                  timeFormat={timeFormat}
                                  disabled={disabled}
                                  className={`w-32 ${!isValid ? 'border-red-500' : ''}`}
                                />
                                {!isValid && (
                                  <span className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Outside parent hours
                                  </span>
                                )}
                                {daySchedule.ranges.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveRange(day, rangeIndex)}
                                    disabled={disabled}
                                    className="text-red-500 hover:text-red-600 ml-auto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No time ranges set. Add your first time range.
                        </p>
                      )}

                      {/* Add Range Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRange(day)}
                        disabled={disabled}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Time Range
                      </Button>

                      {/* Parent Hours Display */}
                      {parentRanges.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Parent hours: {parentRanges.map((r, i) => (
                            <span key={i}>
                              {r.start} - {r.end}
                              {i < parentRanges.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Unavailable</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDayToggle(day)}
                        disabled={disabled}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Hours
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Help Text */}
      <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              💡 Tips for Setting Availability
            </p>
            <ul className="text-sm text-indigo-800 dark:text-indigo-400 space-y-1 list-disc list-inside">
              <li>Add multiple time ranges per day to create breaks (e.g., lunch: 12:00 PM - 1:00 PM)</li>
              <li>{getLevelDescription()}</li>
              <li>Time ranges cannot extend beyond parent availability</li>
              <li>Gaps between ranges are automatically treated as breaks</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};


