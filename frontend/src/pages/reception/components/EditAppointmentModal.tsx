import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, User, MapPin, Briefcase, Phone, Mail, FileText, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Appointment, Service, Provider, Location } from '../types';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

export const EditAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: EditAppointmentModalProps) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_name: '',
    provider_name: '',
    location_name: '',
    appointment_date: '',
    start_time: '',
    duration: '30',
    status: 'Confirmed',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  const { data: servicesData } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.scheduler.api.desk.get_services_list',
    undefined,
    'services'
  );

  const { data: providersData } = useFrappeGetCall<{ message: { providers: Provider[] } }>(
    'appointment.scheduler.api.desk.get_providers_list',
    undefined,
    'providers'
  );

  const { data: locationsData } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.scheduler.api.desk.get_locations_list',
    undefined,
    'locations'
  );

  const { call: updateAppointment, loading: updating } = useFrappePostCall(
    'appointment.scheduler.api.desk.update_appointment'
  );

  // Initialize form data from appointment
  useEffect(() => {
    if (appointment) {
      const startTime = appointment.start_time?.substring(0, 5) || '09:00';
      const endTime = appointment.end_time?.substring(0, 5) || '09:30';
      
      // Calculate duration
      const start = parseISO(`2000-01-01T${appointment.start_time || '09:00:00'}`);
      const end = parseISO(`2000-01-01T${appointment.end_time || '09:30:00'}`);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      const appointmentDate = appointment.appointment_date 
        ? parseISO(appointment.appointment_date)
        : new Date();

      // Normalize email when loading from backend
      const normalizedEmail = appointment.client_email ? normalizeEmail(appointment.client_email) : '';
      
      setFormData({
        client_name: appointment.client_name || '',
        client_phone: appointment.client_phone || '',
        client_email: normalizedEmail,
        service_name: appointment.service || '',
        provider_name: appointment.provider || '',
        location_name: appointment.location || '',
        appointment_date: appointment.appointment_date || format(new Date(), 'yyyy-MM-dd'),
        start_time: startTime,
        duration: durationMinutes.toString(),
        status: appointment.status || 'Confirmed',
        notes: appointment.notes || '',
      });

      setSelectedDate(appointmentDate);

      // Parse time for time picker
      if (appointment.start_time) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        setSelectedHour(hour12);
        setSelectedMinute(minutes);
        setSelectedPeriod(hours >= 12 ? 'PM' : 'AM');
      }
    }
  }, [appointment]);

  // Convert 12-hour time to 24-hour format
  const formatTime24 = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Format time for display
  const formatTimeDisplay = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const services = servicesData?.message?.services || [];
  const providers = providersData?.message?.providers || [];
  const locations = locationsData?.message?.locations || [];

  // Normalize email - clean invalid characters before @
  const normalizeEmail = (email: string): string => {
    if (!email || !email.trim()) return '';
    const trimmed = email.trim();
    const [localPart, domain] = trimmed.split('@');
    if (!domain) return trimmed; // Invalid, return as is
    
    // Remove invalid characters from local part (before @)
    // Valid: letters, numbers, dots, hyphens, underscores
    const cleanedLocal = localPart.replace(/[^a-zA-Z0-9._-]/g, '');
    // Remove consecutive dots and dots at start/end
    const normalizedLocal = cleanedLocal.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
    
    return `${normalizedLocal}@${domain}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) newErrors.client_name = 'Required';
    if (!formData.client_phone.trim()) newErrors.client_phone = 'Required';
    // Strict email validation
    if (formData.client_email && formData.client_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanedEmail = formData.client_email.trim();
      if (!emailRegex.test(cleanedEmail)) {
        newErrors.client_email = 'Invalid email format';
      }
    }
    if (!formData.service_name) newErrors.service_name = 'Required';
    if (!formData.provider_name) newErrors.provider_name = 'Required';
    if (!formData.location_name) newErrors.location_name = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const startDateTime = new Date(`${formData.appointment_date}T${formData.start_time}:00`);
      const durationMinutes = parseInt(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
      const endTime = format(endDateTime, 'HH:mm:ss');

      // Normalize email before submitting
      const normalizedEmail = formData.client_email ? normalizeEmail(formData.client_email) : '';
      
      const result = await updateAppointment({
        appointment_name: appointment.name,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: normalizedEmail,
        service_name: formData.service_name,
        provider_name: formData.provider_name,
        location_name: formData.location_name,
        appointment_date: formData.appointment_date,
        start_time: `${formData.start_time}:00`,
        end_time: endTime,
        status: formData.status,
        notes: formData.notes,
      });

      if (result?.message?.success) {
        toast.success('Appointment updated!', {
          description: `Updated for ${format(startDateTime, 'MMM d, h:mm a')}`,
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Update failed', {
          description: result?.message?.error,
        });
      }
    } catch (error: any) {
      toast.error('Update failed', {
        description: error?.message,
      });
    }
  };

  const InputField = ({ 
    id, 
    label, 
    icon: Icon, 
    type = 'text', 
    ...props 
  }: { 
    id: string; 
    label: string; 
    icon: React.ElementType; 
    type?: string;
    [key: string]: any;
  }) => (
    <div className="relative">
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          activeField === id ? 'text-violet-400' : ''
        }`}
        style={{ color: activeField === id ? 'var(--accent-primary)' : 'var(--text-muted)' }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={formData[id as keyof typeof formData]}
          onChange={(e) => {
            let value = e.target.value;
            // Normalize email as user types
            if (id === 'client_email' && value) {
              value = normalizeEmail(value);
            }
            setFormData({ ...formData, [id]: value });
          }}
          onFocus={() => setActiveField(id)}
          onBlur={() => {
            setActiveField(null);
            // Normalize email on blur
            if (id === 'client_email' && formData.client_email) {
              const normalized = normalizeEmail(formData.client_email);
              if (normalized !== formData.client_email) {
                setFormData({ ...formData, [id]: normalized });
              }
            }
          }}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            errors[id] 
              ? 'border-red-500/50 focus:ring-red-500/20' 
              : 'focus:ring-violet-500/20'
          }`}
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${errors[id] ? 'var(--status-cancelled)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)'
          }}
          {...props}
        />
      </div>
      {errors[id] && (
        <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors[id]}</p>
      )}
    </div>
  );

  const SelectField = ({ 
    id, 
    label, 
    icon: Icon, 
    options, 
    displayKey 
  }: { 
    id: string; 
    label: string; 
    icon: React.ElementType; 
    options: any[];
    displayKey: string;
  }) => (
    <div className="relative">
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          activeField === id ? 'text-violet-400' : ''
        }`}
        style={{ color: activeField === id ? 'var(--accent-primary)' : 'var(--text-muted)' }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <select
          value={formData[id as keyof typeof formData]}
          onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
          onFocus={() => setActiveField(id)}
          onBlur={() => setActiveField(null)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 transition-all ${
            errors[id] 
              ? 'border-red-500/50 focus:ring-red-500/20' 
              : 'focus:ring-violet-500/20'
          }`}
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${errors[id] ? 'var(--status-cancelled)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)'
          }}
        >
          <option value="" style={{ backgroundColor: 'var(--bg-elevated)' }}>Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.name} value={opt.name} style={{ backgroundColor: 'var(--bg-elevated)' }}>
              {opt[displayKey]}
            </option>
          ))}
        </select>
      </div>
      {errors[id] && (
        <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors[id]}</p>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)'
          }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />

          {/* Header */}
          <div 
            className="flex items-center justify-between p-6"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary" />
                <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Edit Appointment
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Update appointment details
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <InputField id="client_name" label="Client Name" icon={User} placeholder="John Doe" />
              <InputField id="client_phone" label="Phone Number" icon={Phone} placeholder="+251 9XX XXX XXX" />
            </div>

            <InputField 
              id="client_email" 
              label="Email Address" 
              icon={Mail} 
              type="email" 
              placeholder="john@example.com"
            />

            {/* Service Details */}
            <div className="grid grid-cols-3 gap-4">
              <SelectField id="service_name" label="Service" icon={Briefcase} options={services} displayKey="service_name" />
              <SelectField id="provider_name" label="Provider" icon={User} options={providers} displayKey="provider_name" />
              <SelectField id="location_name" label="Location" icon={MapPin} options={locations} displayKey="location_name" />
            </div>

            {/* Date & Time */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.5fr 0.5fr' }}>
              {/* Date Picker */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Date
                </label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        height: '42px'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setFormData({ ...formData, appointment_date: format(date, 'yyyy-MM-dd') });
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Start Time
                </label>
                <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        height: '42px'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        {formatTimeDisplay(selectedHour, selectedMinute, selectedPeriod)}
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start" 
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="flex p-2">
                      {/* Hours */}
                      <div className="flex flex-col items-center border-r pr-2 mr-2" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="text-xs font-medium mb-1 px-3" style={{ color: 'var(--text-muted)' }}>Hour</div>
                        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => {
                                setSelectedHour(hour);
                                const time24 = formatTime24(hour, selectedMinute, selectedPeriod);
                                setFormData({ ...formData, start_time: time24 });
                              }}
                              className={cn(
                                "w-12 px-3 py-1.5 text-sm rounded-md transition-colors",
                                selectedHour === hour
                                  ? "text-white"
                                  : "hover:bg-accent"
                              )}
                              style={{
                                backgroundColor: selectedHour === hour ? 'var(--accent-primary)' : 'transparent',
                                color: selectedHour === hour ? 'white' : 'var(--text-primary)'
                              }}
                            >
                              {hour}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Minutes */}
                      <div className="flex flex-col items-center border-r pr-2 mr-2" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="text-xs font-medium mb-1 px-3" style={{ color: 'var(--text-muted)' }}>Min</div>
                        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                          {[0, 15, 30, 45].map((minute) => (
                            <button
                              key={minute}
                              type="button"
                              onClick={() => {
                                setSelectedMinute(minute);
                                const time24 = formatTime24(selectedHour, minute, selectedPeriod);
                                setFormData({ ...formData, start_time: time24 });
                              }}
                              className={cn(
                                "w-12 px-3 py-1.5 text-sm rounded-md transition-colors",
                                selectedMinute === minute
                                  ? "text-white"
                                  : "hover:bg-accent"
                              )}
                              style={{
                                backgroundColor: selectedMinute === minute ? 'var(--accent-primary)' : 'transparent',
                                color: selectedMinute === minute ? 'white' : 'var(--text-primary)'
                              }}
                            >
                              {minute.toString().padStart(2, '0')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* AM/PM */}
                      <div className="flex flex-col items-center">
                        <div className="text-xs font-medium mb-1 px-3" style={{ color: 'var(--text-muted)' }}>Period</div>
                        <div className="flex flex-col gap-1">
                          {(['AM', 'PM'] as const).map((period) => (
                            <button
                              key={period}
                              type="button"
                              onClick={() => {
                                setSelectedPeriod(period);
                                const time24 = formatTime24(selectedHour, selectedMinute, period);
                                setFormData({ ...formData, start_time: time24 });
                              }}
                              className={cn(
                                "w-12 px-3 py-1.5 text-sm rounded-md transition-colors",
                                selectedPeriod === period
                                  ? "text-white"
                                  : "hover:bg-accent"
                              )}
                              style={{
                                backgroundColor: selectedPeriod === period ? 'var(--accent-primary)' : 'transparent',
                                color: selectedPeriod === period ? 'white' : 'var(--text-primary)'
                              }}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {errors.start_time && (
                  <p className="text-xs mt-1" style={{ color: 'var(--status-cancelled)' }}>{errors.start_time}</p>
                )}
              </div>

              {/* Duration */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    height: '42px'
                  }}
                >
                  <option value="15" style={{ backgroundColor: 'var(--bg-elevated)' }}>15 min</option>
                  <option value="30" style={{ backgroundColor: 'var(--bg-elevated)' }}>30 min</option>
                  <option value="45" style={{ backgroundColor: 'var(--bg-elevated)' }}>45 min</option>
                  <option value="60" style={{ backgroundColor: 'var(--bg-elevated)' }}>60 min</option>
                  <option value="90" style={{ backgroundColor: 'var(--bg-elevated)' }}>90 min</option>
                  <option value="120" style={{ backgroundColor: 'var(--bg-elevated)' }}>120 min</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="relative">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select
                data-qa="appointment-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="Pending" style={{ backgroundColor: 'var(--bg-elevated)' }}>Pending</option>
                <option value="Confirmed" style={{ backgroundColor: 'var(--bg-elevated)' }}>Confirmed</option>
                <option value="Completed" style={{ backgroundColor: 'var(--bg-elevated)' }}>Completed</option>
                <option value="Cancelled" style={{ backgroundColor: 'var(--bg-elevated)' }}>Cancelled</option>
                <option value="No Show" style={{ backgroundColor: 'var(--bg-elevated)' }}>No Show</option>
              </select>
            </div>

            {/* Notes */}
            <div className="relative">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</label>
              <div className="relative">
                <div className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium transition-colors rounded-xl"
                style={{ 
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                data-qa="appointment-update-submit"
                whileHover={updating ? {} : { scale: 1.02 }}
                whileTap={updating ? {} : { scale: 0.98 }}
                type="submit"
                disabled={updating}
                className="relative group flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-50"
                style={{ 
                  background: updating 
                    ? 'var(--border-subtle)' 
                    : 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                  opacity: updating ? 0.6 : 1
                }}
              >
                {updating ? (
                  <Loader2 className="relative z-10 w-4 h-4 text-white animate-spin" />
                ) : (
                  <Sparkles className="relative z-10 w-4 h-4 text-white" />
                )}
                <span className="relative z-10 text-white">
                  {updating ? 'Updating...' : 'Update Appointment'}
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

