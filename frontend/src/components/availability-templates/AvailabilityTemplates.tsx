import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Clock, Zap, Coffee, ChevronDown, ChevronUp } from 'lucide-react';
import { DaySchedule } from '@/components/availability-editor';
import { formatEthiopianTime } from '@/pages/booking-v2/utils/ethiopianTime';
import type { TimeFormat } from '@/pages/booking-v2/types';

interface AvailabilityTemplatesProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  timeFormat?: TimeFormat;
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

const calculateEndTime = (startTime: StartTime, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration * 60;
  
  // For 24 hours, set to 23:59 (end of day)
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
      // Split into two ranges with lunch break
      const lunchStart = '12:00';
      const lunchEnd = '13:00';
      
      // Morning range: start to lunch start
      const morningEnd = lunchStart;
      
      // Afternoon range: lunch end to end
      const afternoonStart = lunchEnd;
      
      return {
        day,
        isOpen: true,
        ranges: [
          { start: startTime, end: morningEnd },
          { start: afternoonStart, end: endTime },
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

export const AvailabilityTemplates = ({ schedule, onChange, timeFormat = '12h' }: AvailabilityTemplatesProps) => {
  const [isQuickTemplatesOpen, setIsQuickTemplatesOpen] = useState(true);
  const [isPerDayTemplatesOpen, setIsPerDayTemplatesOpen] = useState(false);

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
  };

  const applyTemplateToDay = (day: string, startTime: StartTime, duration: Duration, includeLunch: boolean = false) => {
    const newSchedule = [...schedule];
    const templateDay = createScheduleFromTemplate([day], startTime, duration, includeLunch)[0];
    
    const index = newSchedule.findIndex((d) => d.day === day);
    if (index !== -1) {
      newSchedule[index] = templateDay;
    } else {
      newSchedule.push(templateDay);
    }
    
    onChange(newSchedule);
  };

  const addLunchBreak = (day: string) => {
    const newSchedule = [...schedule];
    const dayIndex = newSchedule.findIndex((d) => d.day === day);
    
    if (dayIndex === -1 || !newSchedule[dayIndex].isOpen) {
      return; // Day not open, can't add lunch break
    }
    
    const daySchedule = newSchedule[dayIndex];
    const ranges = daySchedule.ranges;
    
    if (ranges.length === 0) {
      return; // No ranges to split
    }
    
    // If already has lunch break (2 ranges), don't add again
    if (ranges.length >= 2) {
      return;
    }
    
    // Find the range that contains 12:00 PM
    const lunchStart = '12:00';
    const lunchEnd = '13:00';
    
    const rangeToSplit = ranges[0];
    if (rangeToSplit.start <= lunchStart && rangeToSplit.end >= lunchEnd) {
      // Split the range
      newSchedule[dayIndex] = {
        ...daySchedule,
        ranges: [
          { start: rangeToSplit.start, end: lunchStart },
          { start: lunchEnd, end: rangeToSplit.end },
        ],
      };
      onChange(newSchedule);
    }
  };

  // Generate quick templates with dynamic labels based on time format
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
      const lunchText = template.includeLunch 
        ? timeFormat === 'ethiopian' ? ' (with lunch)' : ' (with lunch)'
        : '';
      
      return {
        ...template,
        label: `${startFormatted} - ${endFormatted}${lunchText}`,
      };
    });
  };

  const quickTemplates = getQuickTemplates();

  // For per-day templates, generate labels based on time format
  const getStartTimes = () => {
    return ['08:00', '08:30', '09:00'].map((time) => ({
      value: time as StartTime,
      label: formatTime(time, timeFormat),
    }));
  };

  const startTimes = getStartTimes();

  const durations: { value: Duration; label: string }[] = [
    { value: 8, label: '8 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' },
  ];

  return (
    <div className="space-y-4 mb-6">
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
                Apply a schedule to all weekdays (Monday - Friday) with one click. You can customize individual days after applying.
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

      {/* Per-Day Templates */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
        <button
          onClick={() => setIsPerDayTemplatesOpen(!isPerDayTemplatesOpen)}
          className="w-full flex items-center justify-between gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Per-Day Templates</h3>
          </div>
          {isPerDayTemplatesOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        
        <AnimatePresence initial={false}>
          {isPerDayTemplatesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Apply templates to individual days or add lunch breaks to existing schedules
              </p>
              
              <div className="space-y-4">
                {schedule.map((daySchedule) => {
                  const hasSingleRange = daySchedule.isOpen && daySchedule.ranges.length === 1;
                  const canAddLunch = hasSingleRange && 
                    daySchedule.ranges[0].start <= '12:00' && 
                    daySchedule.ranges[0].end >= '13:00';
                  
                  return (
                    <div key={daySchedule.day} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[100px]">
                          {daySchedule.day}:
                        </span>
                        {canAddLunch && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addLunchBreak(daySchedule.day)}
                            className="text-xs h-7 text-orange-600 hover:text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                          >
                            <Coffee className="w-3 h-3 mr-1" />
                            Add Lunch Break
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {startTimes.map((start) =>
                          durations.map((duration) => {
                            const endTime = calculateEndTime(start.value, duration.value);
                            const endFormatted = formatTime(endTime, timeFormat);
                            return (
                              <Button
                                key={`${daySchedule.day}-${start.value}-${duration.value}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => applyTemplateToDay(daySchedule.day, start.value, duration.value, false)}
                                className="text-xs h-7 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                {start.label} - {endFormatted}
                              </Button>
                            );
                          })
                        )}
                        {startTimes.map((start) =>
                          durations.filter(d => d >= 8).map((duration) => {
                            const endTime = calculateEndTime(start.value, duration.value);
                            const endFormatted = formatTime(endTime, timeFormat);
                            return (
                              <Button
                                key={`${daySchedule.day}-${start.value}-${duration.value}-lunch`}
                                variant="ghost"
                                size="sm"
                                onClick={() => applyTemplateToDay(daySchedule.day, start.value, duration.value, true)}
                                className="text-xs h-7 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                {start.label} - {endFormatted} + Lunch
                              </Button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

