/**
 * BookingForm - Phase 3: Confirm
 * Premium contact details form with validation
 * Redesigned with "100 million startup" aesthetic
 */

import { useState } from "react";
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, MessageSquare, Users, Loader2, CheckCircle2, MapPin, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { formatDate, formatTime } from "../../utils/dateHelpers";
import { useTheme } from "@/components/theme-provider";
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
  const { theme, setTheme } = useTheme();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

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
    <div 
      className={cn("w-full min-h-screen relative", className)}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={loading}
            className="backdrop-blur-sm"
            style={{ 
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Date/Time
          </Button>

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

      <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-8 md:py-16">

        <div className="grid lg:grid-cols-[1fr,400px] gap-6 md:gap-8">
          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl backdrop-blur-sm p-6 md:p-8"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="mb-6">
              <h1 
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Confirm Your Booking
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Enter your details to complete the appointment
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label 
                  htmlFor="userName" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Full Name <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </Label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <User className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <Input
                    id="userName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.userName}
                    onChange={(e) => handleChange("userName", e.target.value)}
                    onBlur={() => handleBlur("userName")}
                    disabled={loading}
                    className={cn(
                      "pl-12 h-12 text-base backdrop-blur-sm transition-all",
                      errors.userName && touched.userName && "border-red-500 focus:border-red-500"
                    )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.userName && touched.userName ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      placeholder: 'var(--text-muted)'
                    }}
                    aria-invalid={errors.userName && touched.userName ? "true" : "false"}
                    aria-describedby={errors.userName ? "userName-error" : undefined}
                  />
                </div>
                {errors.userName && touched.userName && (
                  <p 
                    id="userName-error" 
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <span className="text-xs">⚠</span> {errors.userName}
                  </p>
                )}
              </motion.div>

              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <Label 
                  htmlFor="userEmail" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Email Address <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </Label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <Mail className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.userEmail}
                    onChange={(e) => handleChange("userEmail", e.target.value)}
                    onBlur={() => handleBlur("userEmail")}
                    disabled={loading}
                    className={cn(
                      "pl-12 h-12 text-base backdrop-blur-sm transition-all",
                      errors.userEmail && touched.userEmail && "border-red-500 focus:border-red-500"
                    )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.userEmail && touched.userEmail ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      placeholder: 'var(--text-muted)'
                    }}
                    aria-invalid={errors.userEmail && touched.userEmail ? "true" : "false"}
                    aria-describedby={errors.userEmail ? "userEmail-error" : undefined}
                  />
                </div>
                {errors.userEmail && touched.userEmail && (
                  <p 
                    id="userEmail-error" 
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <span className="text-xs">⚠</span> {errors.userEmail}
                  </p>
                )}
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  You'll receive a calendar invite at this email
                </p>
              </motion.div>

              {/* Phone Field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label 
                  htmlFor="userPhone" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Phone Number <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </Label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <Phone className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <Input
                    id="userPhone"
                    type="tel"
                    placeholder="+251 91 234 5678"
                    value={formData.userPhone}
                    onChange={(e) => handleChange("userPhone", e.target.value)}
                    onBlur={() => handleBlur("userPhone")}
                    disabled={loading}
                    className={cn(
                      "pl-12 h-12 text-base backdrop-blur-sm transition-all",
                      errors.userPhone && touched.userPhone && "border-red-500 focus:border-red-500"
                    )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.userPhone && touched.userPhone ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      placeholder: 'var(--text-muted)'
                    }}
                    aria-invalid={errors.userPhone && touched.userPhone ? "true" : "false"}
                    aria-describedby={errors.userPhone ? "userPhone-error" : undefined}
                  />
                </div>
                {errors.userPhone && touched.userPhone && (
                  <p 
                    id="userPhone-error" 
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <span className="text-xs">⚠</span> {errors.userPhone}
                  </p>
                )}
              </motion.div>

              {/* Additional Participants */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <Label 
                  htmlFor="otherParticipants" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Additional Participants <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </Label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <Users className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <Input
                    id="otherParticipants"
                    type="text"
                    placeholder="name@example.com, another@example.com"
                    value={formData.otherParticipants}
                    onChange={(e) => handleChange("otherParticipants", e.target.value)}
                    disabled={loading}
                    className="pl-12 h-12 text-base backdrop-blur-sm transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      placeholder: 'var(--text-muted)'
                    }}
                  />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Add emails separated by commas
                </p>
              </motion.div>

              {/* Notes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label 
                  htmlFor="notes" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Notes or Special Requests <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </Label>
                <div className="relative">
                  <div 
                    className="absolute left-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or topics you'd like to discuss..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    disabled={loading}
                    className="pl-12 min-h-[120px] text-base resize-none backdrop-blur-sm transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      placeholder: 'var(--text-muted)'
                    }}
                    rows={4}
                  />
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold backdrop-blur-sm shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading 
                      ? 'var(--bg-secondary)' 
                      : 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                    color: 'white',
                    border: '1px solid transparent'
                  }}
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
              </motion.div>
            </form>
          </motion.div>

          {/* Booking Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-8 h-fit"
          >
            <div 
              className="rounded-2xl backdrop-blur-sm p-6 shadow-lg"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)'
              }}
            >
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Booking Summary
              </h3>

              <div className="space-y-4">
                {/* Service */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3 pb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <Calendar className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Service</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {service.name}
                    </p>
                    {service.provider && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        with {service.provider.name}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Date & Time */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-start gap-3 pb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      opacity: 0.2
                    }}
                  >
                    <Clock className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Date & Time</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(selectedDate, 'full')}
                    </p>
                    <p className="mt-1" style={{ color: 'var(--text-primary)' }}>
                      {formattedTime}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {service.duration} minutes
                    </p>
                  </div>
                </motion.div>

                {/* Location */}
                {service.location && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-start gap-3 pb-4"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                        opacity: 0.2
                      }}
                    >
                      <MapPin className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Location</p>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {service.location.is_online ? (
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--accent-success)' }}
                            ></span>
                            Online Meeting
                          </span>
                        ) : (
                          service.location.location_name
                        )}
                      </p>
                      {service.location.address && !service.location.is_online && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {service.location.address}
                        </p>
                      )}
                      {service.location.phone && !service.location.is_online && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {service.location.phone}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Timezone */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <p className="font-medium mb-1">Timezone</p>
                  <p>{timezone}</p>
                </motion.div>

                {/* Price (if applicable) */}
                {service.price && service.price > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="pt-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {service.price} {service.currency || "ETB"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Info Banner */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="mt-6 p-4 rounded-lg backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  You'll receive a calendar invite with the meeting link immediately after booking.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

