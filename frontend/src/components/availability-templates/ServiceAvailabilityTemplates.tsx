import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { 
  Clock, 
  Zap, 
  Coffee, 
  ChevronDown, 
  ChevronUp, 
  Building2,
  ArrowDownFromLine,
  Plus,
  Minus
} from 'lucide-react';
import { DaySchedule } from '@/components/availability-editor';
import { formatEthiopianTime } from '@/pages/booking-v2/utils/ethiopianTime';
import type { TimeFormat } from '@/pages/booking-v2/types';

interface ServiceAvailabilityTemplatesProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  parentSchedule?: DaySchedule[]; // Location schedule to inherit from
  locationName?: string;
  timeFormat?: TimeFormat;
  onUseDefaultChange?: (useDefault: boolean) => void;
}

type StartTime = '08:00' | '08:30' | '09:00';
type Duration = 8 | 12 | 24;

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Format time based on user's preferred format
 */
const formatTime = (time24: string, format: TimeFormat = '12h'): string => {
  if (!time24 || time24 === '') return '';
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
  switch (format) {
    case '12h': {
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    case '24h':
      return time24;
    case 'ethiopian': {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return formatEthiopianTime(date);
    }
    default:
      return time24;
  }
};

/**
 * Add minutes to a time string (HH:MM format)
 * Returns the new time, clamped within min/max boundaries
 * 
 * For start time: Can be earlier than location (no minTime constraint)
 * For end time: Cannot be after location end (maxTime constraint applies)
 */
const addMinutesToTime = (
  time: string, 
  minutes: number, 
  minTime?: string, 
  maxTime?: string,
  allowEarlier: boolean = false // For start time, allow going earlier than minTime
): string => {
  const [hours, mins] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + mins + minutes;
  
  // Clamp to 00:00 - 23:59
  totalMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  const newTime = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  
  // Apply boundaries if provided
  // For start time: allowEarlier=true means we can go earlier than minTime
  if (minTime && !allowEarlier && newTime < minTime) return minTime;
  // For end time: always enforce maxTime (cannot exceed location closing)
  if (maxTime && newTime > maxTime) return maxTime;
  
  return newTime;
};

const calculateEndTime = (startTime: StartTime, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration * 60;
  
  if (duration === 24) {
    return '23:59';
  }
  
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

const createScheduleFromTemplate = (
  days: string[],
  startTime: StartTime,
  duration: Duration,
  includeLunch: boolean = false
): DaySchedule[] => {
  const endTime = calculateEndTime(startTime, duration);
  
  return days.map((day) => {
    if (includeLunch && duration >= 8) {
      const lunchStart = '12:00';
      const lunchEnd = '13:00';
      
      return {
        day,
        isOpen: true,
        ranges: [
          { start: startTime, end: lunchStart },
          { start: lunchEnd, end: endTime },
        ],
      };
    } else {
      return {
        day,
        isOpen: true,
        ranges: [{ start: startTime, end: endTime }],
      };
    }
  });
};

export const ServiceAvailabilityTemplates = ({ 
  schedule, 
  onChange, 
  parentSchedule,
  locationName,
  timeFormat = '12h',
  onUseDefaultChange
}: ServiceAvailabilityTemplatesProps) => {
  const [isQuickTemplatesOpen, setIsQuickTemplatesOpen] = useState(false);
  const [isInheritOpen, setIsInheritOpen] = useState(true);
  
  // Offset configuration
  const [startOffset, setStartOffset] = useState(0);
  const [endOffset, setEndOffset] = useState(0);

  const applyTemplateToAllWeekdays = (startTime: StartTime, duration: Duration, includeLunch: boolean = false) => {
    const newSchedule = [...schedule];
    const templateDays = createScheduleFromTemplate(weekdays, startTime, duration, includeLunch);
    
    templateDays.forEach((templateDay) => {
      const index = newSchedule.findIndex((d) => d.day === templateDay.day);
      if (index !== -1) {
        newSchedule[index] = templateDay;
      } else {
        newSchedule.push(templateDay);
      }
    });
    
    onChange(newSchedule);
    onUseDefaultChange?.(false);
  };

  const inheritFromLocation = () => {
    if (!parentSchedule) return;
    onChange([...parentSchedule]);
    onUseDefaultChange?.(false);
  };

  const applyOffsetFromLocation = () => {
    if (!parentSchedule) {
      return;
    }
    
    if (startOffset === 0 && endOffset === 0) {
      return;
    }
    
    const newSchedule: DaySchedule[] = parentSchedule.map((daySchedule) => {
      if (!daySchedule.isOpen || daySchedule.ranges.length === 0) {
        return { ...daySchedule };
      }
      
      // Get the overall location bounds for this day
      const locationStart = daySchedule.ranges[0].start;
      const locationEnd = daySchedule.ranges[daySchedule.ranges.length - 1].end;
      
      const newRanges = daySchedule.ranges.map((range) => {
        // Convert times to minutes for easier calculation
        const timeToMinutes = (time: string): number => {
          const [hours, mins] = time.split(':').map(Number);
          return hours * 60 + mins;
        };
        
        const minutesToTime = (totalMinutes: number): string => {
          const hours = Math.floor(totalMinutes / 60) % 24;
          const mins = totalMinutes % 60;
          return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };
        
        // Get original times in minutes
        const rangeStartMins = timeToMinutes(range.start);
        const rangeEndMins = timeToMinutes(range.end);
        const locationStartMins = timeToMinutes(locationStart);
        const locationEndMins = timeToMinutes(locationEnd);
        
        // Apply start offset: add minutes (startOffset is positive for "later")
        let newStartMins = rangeStartMins + startOffset;
        // Constraint: cannot start earlier than location start
        newStartMins = Math.max(newStartMins, locationStartMins);
        // Constraint: cannot start at or after the original range end
        newStartMins = Math.min(newStartMins, rangeEndMins - 1);
        
        // Apply end offset: subtract minutes (endOffset is positive for "earlier")
        let newEndMins = rangeEndMins - endOffset;
        // Constraint: cannot end later than location end
        newEndMins = Math.min(newEndMins, locationEndMins);
        // Constraint: must end after new start (at least 1 minute difference)
        newEndMins = Math.max(newEndMins, newStartMins + 1);
        
        // If the range is invalid, skip it
        if (newStartMins >= newEndMins) {
          return null;
        }
        
        return {
          start: minutesToTime(newStartMins),
          end: minutesToTime(newEndMins),
        };
      }).filter((range): range is { start: string; end: string } => range !== null && range.start < range.end);
      
      return {
        day: daySchedule.day,
        isOpen: newRanges.length > 0,
        ranges: newRanges,
      };
    });
    
    onChange(newSchedule);
    onUseDefaultChange?.(false);
  };

  const getQuickTemplates = () => {
    const templates = [
      { startTime: '08:00' as StartTime, duration: 8 as Duration, includeLunch: false },
      { startTime: '08:00' as StartTime, duration: 8 as Duration, includeLunch: true },
      { startTime: '09:00' as StartTime, duration: 8 as Duration, includeLunch: false },
      { startTime: '09:00' as StartTime, duration: 8 as Duration, includeLunch: true },
    ];

    return templates.map((template) => {
      const endTime = calculateEndTime(template.startTime, template.duration);
      const startFormatted = formatTime(template.startTime, timeFormat);
      const endFormatted = formatTime(endTime, timeFormat);
      const lunchText = template.includeLunch ? ' (with lunch)' : '';
      
      return {
        ...template,
        label: `${startFormatted} - ${endFormatted}${lunchText}`,
      };
    });
  };

  const quickTemplates = getQuickTemplates();
  const hasParentSchedule = parentSchedule && parentSchedule.some(d => d.isOpen && d.ranges.length > 0);

  // Offset presets (positive = later for start, earlier for end)
  const offsetPresets = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Inherit from Location */}
      {hasParentSchedule && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
          <button
            onClick={() => setIsInheritOpen(!isInheritOpen)}
            className="w-full flex items-center justify-between gap-2 mb-3 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Inherit from Location {locationName && <span className="text-sm font-normal text-gray-500">({locationName})</span>}
              </h3>
            </div>
            {isInheritOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          
          <AnimatePresence initial={false}>
            {isInheritOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Copy the location's availability directly, or adjust with time offsets.
                </p>
                
                <div className="space-y-4">
                  {/* Direct Copy */}
                  <Button
                    variant="outline"
                    onClick={inheritFromLocation}
                    className="w-full justify-start hover:bg-emerald-100 dark:hover:bg-emerald-900/30 h-auto py-3"
                  >
                    <ArrowDownFromLine className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">Copy Location Hours Exactly</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Use the same schedule as the location
                      </div>
                    </div>
                  </Button>
                  
                  {/* Offset Controls */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Offset from Location Hours
                    </h4>
                    
                    {/* Start Time Offset */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Start Time: <span className="font-medium text-gray-900 dark:text-white">
                          {startOffset === 0 ? 'Same as location' : `${startOffset} min later`}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">(Cannot start earlier than location)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStartOffset(Math.max(0, startOffset - 15))}
                          disabled={startOffset <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 flex gap-1 flex-wrap">
                          {/* Only positive presets (later) */}
                          {offsetPresets.map((preset) => (
                            <Button
                              key={`start-${preset.value}`}
                              variant={startOffset === preset.value ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setStartOffset(preset.value)}
                              className="text-xs"
                            >
                              {preset.label} later
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStartOffset(Math.min(240, startOffset + 15))}
                          disabled={startOffset >= 240}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStartOffset(0)}
                        className="mt-1 text-xs"
                      >
                        Reset to 0
                      </Button>
                    </div>
                    
                    {/* End Time Offset */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                        End Time: <span className="font-medium text-gray-900 dark:text-white">
                          {endOffset === 0 ? 'Same as location' : 
                           endOffset > 0 ? `${endOffset} min earlier` : `${Math.abs(endOffset)} min later`}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">(Cannot exceed location closing)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEndOffset(Math.max(0, endOffset - 15))}
                          disabled={endOffset <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 flex gap-1 flex-wrap">
                          {offsetPresets.map((preset) => (
                            <Button
                              key={`end-${preset.value}`}
                              variant={endOffset === preset.value ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setEndOffset(preset.value)}
                              className="text-xs"
                            >
                              {preset.label} earlier
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEndOffset(Math.min(240, endOffset + 15))}
                          disabled={endOffset >= 240}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEndOffset(0)}
                        className="mt-1 text-xs"
                      >
                        Reset to 0
                      </Button>
                    </div>
                    
                    {/* Apply Button */}
                    <Button
                      onClick={applyOffsetFromLocation}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={startOffset === 0 && endOffset === 0}
                    >
                      Apply Offset to All Days
                    </Button>
                    
                    {/* Preview */}
                    {(startOffset !== 0 || endOffset !== 0) && parentSchedule && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {parentSchedule.filter(d => d.isOpen && d.ranges.length > 0).slice(0, 3).map((day) => {
                            const originalStart = day.ranges[0].start;
                            const originalEnd = day.ranges[day.ranges.length - 1].end;
                            const newStart = addMinutesToTime(originalStart, startOffset, originalStart, originalEnd, false);
                            const newEnd = addMinutesToTime(originalEnd, -endOffset, newStart, originalEnd, false);
                            
                            return (
                              <div key={day.day} className="flex justify-between">
                                <span>{day.day}:</span>
                                <span>
                                  <span className="line-through text-gray-400">{formatTime(originalStart, timeFormat)} - {formatTime(originalEnd, timeFormat)}</span>
                                  {' → '}
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {formatTime(newStart, timeFormat)} - {formatTime(newEnd, timeFormat)}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                          {parentSchedule.filter(d => d.isOpen).length > 3 && (
                            <div className="text-gray-400">...and more</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Quick Templates for All Weekdays */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
        <button
          onClick={() => setIsQuickTemplatesOpen(!isQuickTemplatesOpen)}
          className="w-full flex items-center justify-between gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick Templates (All Weekdays)</h3>
          </div>
          {isQuickTemplatesOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        
        <AnimatePresence initial={false}>
          {isQuickTemplatesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Apply a schedule to all weekdays. Service hours must be within location hours.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplateToAllWeekdays(template.startTime, template.duration, template.includeLunch)}
                    className="w-full justify-start hover:bg-purple-100 dark:hover:bg-purple-900/30 h-auto py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{template.label}</div>
                        {template.includeLunch && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <Coffee className="w-3 h-3" />
                            Includes lunch break
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

