/**
 * DateTimeSelector - The heart of the redesign
 * Unified calendar + time slots view
 */

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../utils/dateHelpers";
import { CalendarPanel } from "./CalendarPanel";
import { TimeSlotsPanel } from "./TimeSlotsPanel";
import { TimeFormatToggle } from "../shared/TimeFormatToggle";
import { cn } from "@/lib/utils";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/button";
import type { TimeSlot } from "../../types";

interface DateTimeSelectorProps {
  // Calendar props
  selectedDate: Date | null;
  displayMonth: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  availableDays?: number[];
  minDate?: Date;
  maxDate?: Date;
  
  // Time slots props
  availableSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  
  // Configuration
  timeFormat: '12h' | '24h' | 'ethiopian';
  onTimeFormatChange: (format: '12h' | '24h' | 'ethiopian') => void;
  timezone: string;
  
  // State
  loading?: boolean;
  
  // Context
  serviceName?: string;
  providerName?: string;
  duration?: number;
  location?: {
    name: string;
    location_name: string;
    address?: string;
    is_online?: boolean;
  };
  
  // Navigation
  onBack?: () => void;
}

export function DateTimeSelector({
  selectedDate,
  displayMonth,
  onDateSelect,
  onMonthChange,
  availableDays,
  minDate,
  maxDate,
  availableSlots,
  selectedSlot,
  onSlotSelect,
  timeFormat,
  onTimeFormatChange,
  timezone,
  loading = false,
  serviceName,
  providerName,
  duration,
  location,
  onBack,
}: DateTimeSelectorProps) {
  const MAX_VISIBLE_PROVIDERS = 4;
  const providers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    availableSlots.forEach((slot) => {
      if (slot.provider?.id && slot.provider.name) {
        map.set(slot.provider.id, {
          id: slot.provider.id,
          name: slot.provider.name,
        });
      }
    });
    return Array.from(map.values());
  }, [availableSlots]);

  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [showAllProviders, setShowAllProviders] = useState(false);

  useEffect(() => {
    if (
      selectedProviderId !== "all" &&
      !providers.some((provider) => provider.id === selectedProviderId)
    ) {
      setSelectedProviderId("all");
    }
  }, [providers, selectedProviderId]);

useEffect(() => {
  if (providers.length <= MAX_VISIBLE_PROVIDERS && showAllProviders) {
    setShowAllProviders(false);
  }
}, [providers.length, showAllProviders]);

const filteredSlots = useMemo(() => {
  if (selectedProviderId === "all") return availableSlots;
  return availableSlots.filter(
    (slot) => slot.provider?.id === selectedProviderId
  );
}, [availableSlots, selectedProviderId]);

useEffect(() => {
  if (providers.length > 0) {
    console.log("[ProviderFilter] Updated", {
      providers: providers.map((p) => p.name),
      selectedProviderId,
      filteredSlotsCount: filteredSlots.length,
    });
  }
}, [providers, selectedProviderId, filteredSlots.length]);

  const visibleProviders = useMemo(() => {
    if (showAllProviders) return providers;
    return providers.slice(0, MAX_VISIBLE_PROVIDERS);
  }, [providers, showAllProviders]);

  const shouldCollapseProviders = providers.length > MAX_VISIBLE_PROVIDERS;

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 space-y-4">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        )}
        
        {/* Title */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Select Your Appointment Time
          </h1>
          {(serviceName || providerName) && (
            <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">
              {serviceName}
              {providerName && ` with ${providerName}`}
              {duration && ` • ${duration} min`}
            </p>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout (Desktop) / Stacked (Mobile) */}
      <div className="grid lg:grid-cols-[400px,1fr] gap-8 items-start">
        {/* Left Column: Calendar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <CalendarPanel
              selectedDate={selectedDate}
              displayMonth={displayMonth}
              onDateSelect={onDateSelect}
              onMonthChange={onMonthChange}
              availableDays={availableDays}
              minDate={minDate}
              maxDate={maxDate}
              loading={loading}
              timeFormat={timeFormat}
            />
          </div>

          {/* Time Format Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <TimeFormatToggle
              value={timeFormat}
              onChange={onTimeFormatChange}
              showLabels={true}
            />
            
            {/* Timezone Info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Timezone: {timezone}</p>
                  <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">All times shown in your local timezone</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Time Slots */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 min-h-[500px]">
            {selectedDate ? (
              <>
                {/* Selected Date Header */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatDate(selectedDate, 'full')}
                  </h2>
                </div>

                {/* Time Slots */}
                {providers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Filter by provider</span>
                      {shouldCollapseProviders && (
                        <button
                          type="button"
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                          onClick={() => setShowAllProviders(!showAllProviders)}
                        >
                          {showAllProviders ? "Show fewer" : "Show all"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedProviderId("all")}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                          selectedProviderId === "all"
                            ? "border-2 border-primary-600 text-primary-700 dark:text-primary-200 bg-white dark:bg-gray-900 shadow-sm"
                            : "border border-transparent text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300"
                        )}
                        aria-pressed={selectedProviderId === "all"}
                      >
                        All providers
                      </button>
                      {visibleProviders.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedProviderId(provider.id)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                            selectedProviderId === provider.id
                              ? "border-2 border-primary-600 text-primary-700 dark:text-primary-200 bg-white dark:bg-gray-900 shadow-sm"
                              : "border border-transparent text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300"
                          )}
                          aria-pressed={selectedProviderId === provider.id}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <TimeSlotsPanel
                  date={selectedDate}
                  slots={filteredSlots}
                  selectedSlot={selectedSlot}
                  onSlotSelect={onSlotSelect}
                  timeFormat={timeFormat}
                  timezone={timezone}
                  loading={loading}
                  groupByTimeOfDay={true}
                  location={location}
                />
              </>
            ) : (
              /* Empty State - No Date Selected */
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                  <svg
                    className="h-10 w-10 text-primary-600 dark:text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Select a date to see available times
                </h3>
                <p className="text-gray-700 dark:text-gray-300 max-w-sm">
                  Choose a date from the calendar to view available appointment slots
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Booking Information</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
              <li>All times are shown in your local timezone</li>
              <li>You'll receive a calendar invite with the meeting link</li>
              <li>You can reschedule or cancel up to 24 hours before</li>
            </ul>
          </div>
        </div>
      </div>
      
    </div>
  );
}
