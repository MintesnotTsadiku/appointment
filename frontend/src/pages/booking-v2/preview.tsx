/**
 * Preview Page - Showcase the redesigned booking UI
 * This page demonstrates the new design with sample data
 */

import { useState } from "react";
import { DateTimeSelector } from "./components/DateTimeSelector";
import { ServiceSelector } from "./components/ServiceSelector";
import { BookingForm } from "./components/BookingForm";
import { CheckoutForm } from "./components/CheckoutForm";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { useBookingState } from "./hooks/useBookingState";
import type { TimeSlot, Organization, Service, BookingFormData, BookingResponse, PaymentData } from "./types";
import { addDays } from "./utils/dateHelpers";
import { Button } from "@/components/button";

// Sample organization data
const sampleOrganization: Organization = {
  id: "org-1",
  slug: "mahlet-clinic",
  name: "Mahlet Clinic",
  logo: undefined,
  description: "Quality healthcare services in Addis Ababa",
  providers: [
    {
      id: "provider-1",
      name: "Dr. Hirut Alemayehu",
      designation: "General Physician",
      services: ["General Consultation", "Follow-up"],
    },
    {
      id: "provider-2",
      name: "Dr. Mahlet Tsadiku",
      designation: "Specialist Physician",
      services: ["Specialist Consultation"],
    },
  ],
  services: [
    {
      id: "service-1",
      slug: "general-consultation",
      name: "General Consultation",
      description: "General health checkup and consultation",
      duration: 30,
      price: 500,
      currency: "ETB",
      type: "individual",
      provider: {
        id: "provider-1",
        name: "Dr. Hirut Alemayehu",
      },
    },
    {
      id: "service-2",
      slug: "specialist-consultation",
      name: "Specialist Consultation",
      description: "Specialized medical consultation",
      duration: 60,
      price: 1000,
      currency: "ETB",
      type: "individual",
      provider: {
        id: "provider-2",
        name: "Dr. Mahlet Tsadiku",
      },
    },
    {
      id: "service-3",
      slug: "follow-up",
      name: "Follow-up Appointment",
      description: "Follow-up visit for existing patients",
      duration: 20,
      price: 300,
      currency: "ETB",
      type: "organization",
      providerCount: 2,
    },
  ],
};

// Sample time slots for demonstration
const generateSampleSlots = (date: Date): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const baseDate = new Date(date);
  baseDate.setHours(8, 0, 0, 0);

  // Morning slots
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(baseDate);
    startTime.setMinutes(i * 30);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    slots.push({
      id: `slot-morning-${i}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      available: true,
      recommended: i === 2, // 9:00 AM is recommended
      provider: i % 2 === 0 ? {
        id: "provider-1",
        name: "Dr. Hirut Alemayehu",
      } : {
        id: "provider-2",
        name: "Dr. Mahlet Tsadiku",
      },
    });
  }

  // Afternoon slots
  baseDate.setHours(14, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const startTime = new Date(baseDate);
    startTime.setMinutes(i * 30);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    slots.push({
      id: `slot-afternoon-${i}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      available: true,
      provider: i % 2 === 0 ? {
        id: "provider-1",
        name: "Dr. Hirut Alemayehu",
      } : {
        id: "provider-2",
        name: "Dr. Mahlet Tsadiku",
      },
    });
  }

  // Evening slots
  baseDate.setHours(17, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const startTime = new Date(baseDate);
    startTime.setMinutes(i * 30);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    slots.push({
      id: `slot-evening-${i}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      available: true,
      provider: {
        id: "provider-1",
        name: "Dr. Hirut Alemayehu",
      },
    });
  }

  return slots;
};

export default function BookingPreview() {
  const { state, setService, setDate, setSlot, setTimeFormat, goToPhase, dispatch, resetBooking, setFormData } = useBookingState();
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [demoPhase, setDemoPhase] = useState<'service' | 'datetime' | 'form' | 'payment' | 'success'>('service');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Sample booking response
  const sampleBookingResponse: BookingResponse = {
    success: true,
    message: "Booking confirmed successfully!",
    bookingId: `BK-${Date.now()}`,
    meetLink: "https://meet.google.com/abc-defg-hij",
    calendarEventUrl: "https://calendar.google.com/event/...",
    rescheduleUrl: "/reschedule/abc123",
    meetingProvider: "Google Meet",
  };

  const handleServiceSelect = (service: Service) => {
    setService(service);
    setDemoPhase('datetime');
  };

  const handleDateSelect = (date: Date) => {
    setDate(date);
    // Generate sample slots for the selected date
    const newSlots = generateSampleSlots(date);
    setSlots(newSlots);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSlot(slot);
    setDemoPhase('form');
  };

  const handleBackToServices = () => {
    setDemoPhase('service');
  };

  const handleBackToDateTime = () => {
    setDemoPhase('datetime');
  };

  const handleBackToForm = () => {
    setDemoPhase('form');
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    setFormData(formData);
    setDemoPhase('payment');
  };

  const handlePaymentSubmit = async (paymentData: PaymentData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    dispatch({ type: 'SET_PAYMENT_DATA', payload: paymentData });
    dispatch({ type: 'SET_BOOKING_RESPONSE', payload: sampleBookingResponse });
    setShowConfirmation(true);
    setDemoPhase('success');
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setDemoPhase('service');
    resetBooking();
    setSlots([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700 rounded-2xl shadow-xl p-6 md:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">
              🎨 Redesigned Booking Experience
            </h1>
            <p className="text-sm md:text-base max-w-2xl font-medium text-white/95">
              Preview of the world-class appointment booking UI. Mobile-first, accessible, and delightful.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-xs uppercase tracking-wider mb-1 font-semibold text-white/85">
              Version
            </div>
            <div className="text-2xl font-bold text-white">2.0</div>
          </div>
        </div>
      </div>

      {/* Design System Info */}
      <div className="max-w-7xl mx-auto mb-8 grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Design Principle
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Mobile-First
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Optimized for touch and small screens
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Accessibility
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            WCAG 2.1 AA
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Keyboard navigation & screen readers
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Performance
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Fast & Smooth
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            60fps animations, instant feedback
          </div>
        </div>
      </div>

      {/* Phase Navigation */}
      <div className="max-w-7xl mx-auto mb-8 flex gap-2 flex-wrap">
        <Button
          variant={demoPhase === 'service' ? 'default' : 'outline'}
          onClick={() => setDemoPhase('service')}
          className="text-sm"
        >
          1. Service Selection
        </Button>
        <Button
          variant={demoPhase === 'datetime' ? 'default' : 'outline'}
          onClick={() => {
            if (!state.service) {
              setService(sampleOrganization.services[0]);
            }
            setDemoPhase('datetime');
          }}
          className="text-sm"
        >
          2. Date & Time
        </Button>
        <Button
          variant={demoPhase === 'form' ? 'default' : 'outline'}
          onClick={() => {
            if (!state.service) {
              setService(sampleOrganization.services[0]);
            }
            if (!state.selectedDate) {
              setDate(new Date());
            }
            if (!state.selectedSlot && slots.length > 0) {
              setSlot(slots[0]);
            }
            setDemoPhase('form');
          }}
          disabled={!state.service || !state.selectedDate || !state.selectedSlot}
          className="text-sm"
        >
          3. Booking Form
        </Button>
        <Button
          variant={demoPhase === 'payment' ? 'default' : 'outline'}
          onClick={() => {
            if (!state.service) {
              setService(sampleOrganization.services[0]);
            }
            if (!state.selectedDate) {
              setDate(new Date());
            }
            if (!state.selectedSlot && slots.length > 0) {
              setSlot(slots[0]);
            }
            setDemoPhase('payment');
          }}
          disabled={!state.service || !state.selectedDate || !state.selectedSlot}
          className="text-sm"
        >
          4. Payment
        </Button>
        <Button
          variant={demoPhase === 'success' ? 'default' : 'outline'}
          onClick={() => {
            setShowConfirmation(true);
            setDemoPhase('success');
          }}
          disabled={!state.selectedSlot}
          className="text-sm"
        >
          5. Confirmation
        </Button>
      </div>

      {/* Main Component - Phase 1: Service Selection */}
      {demoPhase === 'service' && (
        <ServiceSelector
          organization={sampleOrganization}
          services={sampleOrganization.services}
          onServiceSelect={handleServiceSelect}
          loading={false}
        />
      )}

      {/* Main Component - Phase 2: Date & Time Selection */}
      {demoPhase === 'datetime' && state.service && (
        <DateTimeSelector
          selectedDate={state.selectedDate}
          displayMonth={displayMonth}
          onDateSelect={handleDateSelect}
          onMonthChange={setDisplayMonth}
          availableDays={[1, 2, 3, 4, 5]} // Monday to Friday
          minDate={new Date()}
          maxDate={addDays(new Date(), 60)}
          availableSlots={slots}
          selectedSlot={state.selectedSlot}
          onSlotSelect={handleSlotSelect}
          timeFormat={state.timeFormat}
          onTimeFormatChange={setTimeFormat}
          timezone={state.timezone}
          loading={false}
          serviceName={state.service.name}
          providerName={state.service.provider?.name}
          duration={state.service.duration}
          onBack={handleBackToServices}
        />
      )}

      {/* Main Component - Phase 3: Booking Form */}
      {demoPhase === 'form' && state.service && state.selectedDate && state.selectedSlot && (
        <BookingForm
          service={state.service}
          selectedDate={state.selectedDate}
          selectedSlot={state.selectedSlot}
          timeFormat={state.timeFormat}
          timezone={state.timezone}
          onSubmit={handleBookingSubmit}
          onBack={handleBackToDateTime}
          loading={false}
        />
      )}

      {/* Main Component - Phase 4: Payment */}
      {demoPhase === 'payment' && state.service && state.selectedDate && state.selectedSlot && (
        <CheckoutForm
          service={state.service}
          selectedDate={state.selectedDate}
          selectedSlot={state.selectedSlot}
          timeFormat={state.timeFormat}
          timezone={state.timezone}
          userName={state.formData.userName || "John Doe"}
          userEmail={state.formData.userEmail || "john@example.com"}
          onSubmit={handlePaymentSubmit}
          onBack={handleBackToForm}
          loading={false}
        />
      )}

      {/* Main Component - Phase 5: Confirmation Modal */}
      {showConfirmation && state.service && state.selectedDate && state.selectedSlot && (
        <ConfirmationModal
          open={showConfirmation}
          onClose={handleCloseConfirmation}
          bookingResponse={sampleBookingResponse}
          service={state.service}
          selectedDate={state.selectedDate}
          selectedSlot={state.selectedSlot}
          timeFormat={state.timeFormat}
          timezone={state.timezone}
          userEmail={state.formData.userEmail || "demo@example.com"}
        />
      )}

      {/* Design Features Showcase */}
      <div className="max-w-7xl mx-auto mt-12 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Key Design Features
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-700 dark:text-gray-300">
        <p>
          This is a preview of the redesigned booking experience.{" "}
          <a href="/BOOKING_REDESIGN_SPEC.md" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            View full design specification →
          </a>
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    icon: "📱",
    title: "Touch-Optimized",
    description: "Large 48x48px touch targets, perfect for one-handed mobile use",
  },
  {
    icon: "🎨",
    title: "Modern Design",
    description: "Clean, contemporary UI with smooth transitions and micro-interactions",
  },
  {
    icon: "⚡",
    title: "Instant Feedback",
    description: "Every interaction provides immediate visual and haptic feedback",
  },
  {
    icon: "🌍",
    title: "Ethiopian Time",
    description: "Native support for ሰዓት time format with dual display option",
  },
  {
    icon: "♿",
    title: "Accessible",
    description: "Full keyboard navigation, ARIA labels, and screen reader support",
  },
  {
    icon: "🌙",
    title: "Dark Mode",
    description: "Beautiful dark theme that's easy on the eyes",
  },
  {
    icon: "📊",
    title: "Smart Grouping",
    description: "Time slots organized by morning, afternoon, and evening",
  },
  {
    icon: "⭐",
    title: "Recommendations",
    description: "AI-suggested optimal time slots highlighted for quick booking",
  },
  {
    icon: "🔔",
    title: "Clear States",
    description: "Loading, error, and empty states that actually help users",
  },
];

