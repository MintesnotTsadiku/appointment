/**
 * DateTimeSelector - Premium Design System
 * Unified calendar + time slots view with glass-morphism and animations
 */

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../utils/dateHelpers";
import { CalendarPanel } from "./CalendarPanel";
import { TimeSlotsPanel } from "./TimeSlotsPanel";
import { TimeFormatToggle } from "../shared/TimeFormatToggle";
import { cn } from "@/lib/utils";
import { ArrowLeft, Info, Moon, Sun } from "lucide-react";
import { Button } from "@/components/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
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
  const { theme, setTheme } = useTheme();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

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
    <div className="w-full max-w-7xl mx-auto relative">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div 
          className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ background: 'var(--glow-success)' }}
        />
      </div>

      {/* Sticky Header with Back Button and Theme Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 w-full backdrop-blur-xl"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between">
          {/* Back Button */}
          {onBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="backdrop-blur-sm"
              style={{ 
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          ) : (
            <div /> // Spacer when no back button
          )}

          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm transition-all"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme + "-icon"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                ) : (
                  <Sun className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                )}
              </motion.div>
            </AnimatePresence>
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === "light" ? "Dark" : "Light"}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Main Background */}
      <div 
        className="min-h-screen p-5 md:p-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h1 
            className="text-3xl md:text-4xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Select Your Appointment Time
          </h1>
          {(serviceName || providerName) && (
            <p 
              className="mt-2 text-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              {serviceName}
              {providerName && ` with ${providerName}`}
              {duration && ` • ${duration} min`}
            </p>
          )}
        </motion.div>

      {/* Main Content - Two Column Layout (Desktop) / Stacked (Mobile) */}
      <div className="grid lg:grid-cols-[400px,1fr] gap-6 md:gap-8 items-start">
        {/* Left Column: Calendar */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl backdrop-blur-sm p-6"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
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
          </motion.div>

          {/* Time Format Toggle */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl backdrop-blur-sm p-6"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <TimeFormatToggle
              value={timeFormat}
              onChange={onTimeFormatChange}
              showLabels={true}
            />
            
            {/* Timezone Info */}
            <div 
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <p className="font-medium">Timezone: {timezone}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All times shown in your local timezone</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Time Slots */}
        <div className="lg:sticky lg:top-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl backdrop-blur-sm p-6 min-h-[500px]"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            {selectedDate ? (
              <>
                {/* Selected Date Header */}
                <div 
                  className="mb-6 pb-6"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <h2 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatDate(selectedDate, 'full')}
                  </h2>
                </div>

                {/* Time Slots */}
                {providers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>Filter by provider</span>
                      {shouldCollapseProviders && (
                        <button
                          type="button"
                          className="hover:underline transition-all"
                          style={{ color: 'var(--accent-primary)' }}
                          onClick={() => setShowAllProviders(!showAllProviders)}
                        >
                          {showAllProviders ? "Show fewer" : "Show all"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <motion.button
                        type="button"
                        onClick={() => setSelectedProviderId("all")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-sm",
                          selectedProviderId === "all"
                            ? "shadow-sm"
                            : ""
                        )}
                        style={selectedProviderId === "all" ? {
                          background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                          color: 'white',
                          border: '1px solid transparent'
                        } : {
                          backgroundColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-default)'
                        }}
                        aria-pressed={selectedProviderId === "all"}
                      >
                        All providers
                      </motion.button>
                      {visibleProviders.map((provider, index) => (
                        <motion.button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedProviderId(provider.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-sm",
                            selectedProviderId === provider.id
                              ? "shadow-sm"
                              : ""
                          )}
                          style={selectedProviderId === provider.id ? {
                            background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                            color: 'white',
                            border: '1px solid transparent'
                          } : {
                            backgroundColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-default)'
                          }}
                          aria-pressed={selectedProviderId === provider.id}
                        >
                          {provider.name}
                        </motion.button>
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
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full py-12 text-center"
              >
                <div 
                  className="h-20 w-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm"
                  style={{ 
                    background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                    opacity: 0.2
                  }}
                >
                  <svg
                    className="h-10 w-10"
                    style={{ color: 'var(--accent-primary)' }}
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
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Select a date to see available times
                </h3>
                <p 
                  className="max-w-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Choose a date from the calendar to view available appointment slots
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 rounded-xl p-4 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Booking Information</p>
            <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>All times are shown in your local timezone</li>
              <li>You'll receive a calendar invite with the meeting link</li>
              <li>You can reschedule or cancel up to 24 hours before</li>
            </ul>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
