/**
 * BookingForm - Phase 3: Confirm
 * Beautiful contact details form with validation
 */

import { useState } from "react";
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, MessageSquare, Users, Loader2, CheckCircle2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { formatDate, formatTime } from "../../utils/dateHelpers";
import type { BookingFormData, TimeSlot, Service } from "../../types";

interface BookingFormProps {
  // Selected booking details
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  
  // Form handling
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;
  
  // State
  loading?: boolean;
  className?: string;
}

export function BookingForm({
  service,
  selectedDate,
  selectedSlot,
  timeFormat,
  timezone,
  initialData = {},
  onSubmit,
  onBack,
  loading = false,
  className,
}: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    userName: initialData.userName || "",
    userEmail: initialData.userEmail || "",
    userPhone: initialData.userPhone || "",
    notes: initialData.notes || "",
    otherParticipants: initialData.otherParticipants || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof BookingFormData, boolean>>>({});

  // Validation
  const validateField = (field: keyof BookingFormData, value: string): string | undefined => {
    switch (field) {
      case "userName":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        break;
      case "userEmail":
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Please enter a valid email";
        break;
      case "userPhone":
        if (value && value.trim()) {
          const phoneRegex = /^[+]?[\d\s-()]+$/;
          if (!phoneRegex.test(value)) return "Please enter a valid phone number";
        }
        break;
    }
    return undefined;
  };

  const handleChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validate on change if field was touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof BookingFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field] || "");
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};
    (["userName", "userEmail"] as const).forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) newErrors[field] = error;
    });

    // Check optional phone validation
    if (formData.userPhone) {
      const phoneError = validateField("userPhone", formData.userPhone);
      if (phoneError) newErrors.userPhone = phoneError;
    }

    setErrors(newErrors);
    setTouched({
      userName: true,
      userEmail: true,
      userPhone: true,
    });

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Submit the form
    await onSubmit(formData);
  };

  const startTime = new Date(selectedSlot.start_time);
  const formattedTime = timeFormat === '24h' 
    ? formatTime(startTime, '24h', timezone)
    : formatTime(startTime, '12h', timezone);

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={loading}
        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 -ml-2 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Change Date/Time
      </Button>

      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        {/* Form Section */}
        <div>
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Confirm Your Booking
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your details to complete the appointment
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-base font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="userName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                  onBlur={() => handleBlur("userName")}
                  disabled={loading}
                  className={cn(
                    "pl-10 h-12 text-base",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0",
                    errors.userName && touched.userName && "border-red-500 focus:border-red-500"
                  )}
                  aria-invalid={errors.userName && touched.userName ? "true" : "false"}
                  aria-describedby={errors.userName ? "userName-error" : undefined}
                />
              </div>
              {errors.userName && touched.userName && (
                <p id="userName-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.userName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="userEmail" className="text-base font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.userEmail}
                  onChange={(e) => handleChange("userEmail", e.target.value)}
                  onBlur={() => handleBlur("userEmail")}
                  disabled={loading}
                  className={cn(
                    "pl-10 h-12 text-base",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0",
                    errors.userEmail && touched.userEmail && "border-red-500 focus:border-red-500"
                  )}
                  aria-invalid={errors.userEmail && touched.userEmail ? "true" : "false"}
                  aria-describedby={errors.userEmail ? "userEmail-error" : undefined}
                />
              </div>
              {errors.userEmail && touched.userEmail && (
                <p id="userEmail-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.userEmail}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You'll receive a calendar invite at this email
              </p>
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="userPhone" className="text-base font-medium">
                Phone Number <span className="text-gray-400">(optional)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="userPhone"
                  type="tel"
                  placeholder="+251 91 234 5678"
                  value={formData.userPhone}
                  onChange={(e) => handleChange("userPhone", e.target.value)}
                  onBlur={() => handleBlur("userPhone")}
                  disabled={loading}
                  className={cn(
                    "pl-10 h-12 text-base",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0",
                    errors.userPhone && touched.userPhone && "border-red-500 focus:border-red-500"
                  )}
                  aria-invalid={errors.userPhone && touched.userPhone ? "true" : "false"}
                  aria-describedby={errors.userPhone ? "userPhone-error" : undefined}
                />
              </div>
              {errors.userPhone && touched.userPhone && (
                <p id="userPhone-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.userPhone}
                </p>
              )}
            </div>

            {/* Additional Participants */}
            <div className="space-y-2">
              <Label htmlFor="otherParticipants" className="text-base font-medium">
                Additional Participants <span className="text-gray-400">(optional)</span>
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="otherParticipants"
                  type="text"
                  placeholder="name@example.com, another@example.com"
                  value={formData.otherParticipants}
                  onChange={(e) => handleChange("otherParticipants", e.target.value)}
                  disabled={loading}
                  className={cn(
                    "pl-10 h-12 text-base",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0"
                  )}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add emails separated by commas
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-medium">
                Notes or Special Requests <span className="text-gray-400">(optional)</span>
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements or topics you'd like to discuss..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  disabled={loading}
                  className={cn(
                    "pl-10 min-h-[120px] text-base resize-none",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0"
                  )}
                  rows={4}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full h-14 text-lg font-semibold",
                  // Explicit blue colors for better visibility
                  "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
                  "text-white dark:text-white", // Force white text
                  "border-2 border-transparent hover:border-blue-800 dark:hover:border-blue-400", // Add border interaction
                  "shadow-lg hover:shadow-xl transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-700"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Confirming Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Booking Summary Sidebar */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Booking Summary
            </h3>

            <div className="space-y-4">
              {/* Service */}
              <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Service</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {service.name}
                  </p>
                  {service.provider && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      with {service.provider.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(selectedDate, 'full')}
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {formattedTime}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {service.duration} minutes
                  </p>
                </div>
              </div>

              {/* Location */}
              {service.location && (
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {service.location.is_online ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Online Meeting
                        </span>
                      ) : (
                        service.location.location_name
                      )}
                    </p>
                    {service.location.address && !service.location.is_online && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {service.location.address}
                      </p>
                    )}
                    {service.location.phone && !service.location.is_online && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {service.location.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Timezone */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">Timezone</p>
                <p>{timezone}</p>
              </div>

              {/* Price (if applicable) */}
              {service.price && service.price > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Price</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {service.price} {service.currency || "ETB"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Info Banner */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You'll receive a calendar invite with the meeting link immediately after booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

