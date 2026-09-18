import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, MapPin, Briefcase, Phone, Mail, FileText, Loader2, Sparkles } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Service, Provider, Location } from '../types';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  defaultProvider?: string;
  defaultLocation?: string;
}

export const CreateAppointmentModal = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  defaultTime,
  defaultProvider,
  defaultLocation,
}: CreateAppointmentModalProps) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_name: '',
    provider_name: defaultProvider || '',
    location_name: defaultLocation || '',
    appointment_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: defaultTime || '09:00',
    duration: '30',
    notes: '',
  });

  // Update form data when props change
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        appointment_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : prev.appointment_date,
        start_time: defaultTime || prev.start_time,
        provider_name: defaultProvider || prev.provider_name,
        location_name: defaultLocation || prev.location_name,
      }));
    }
  }, [isOpen, defaultDate, defaultTime, defaultProvider, defaultLocation]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

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

  const { call: createAppointment, loading: creating } = useFrappePostCall(
    'appointment.scheduler.api.desk.create_desk_appointment'
  );

  const services = servicesData?.message?.services || [];
  const providers = providersData?.message?.providers || [];
  const locations = locationsData?.message?.locations || [];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) newErrors.client_name = 'Required';
    if (!formData.client_phone.trim()) newErrors.client_phone = 'Required';
    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Invalid email';
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

      const result = await createAppointment({
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email,
        service_name: formData.service_name,
        provider_name: formData.provider_name,
        location_name: formData.location_name,
        appointment_date: formData.appointment_date,
        start_time: `${formData.start_time}:00`,
        end_time: endTime,
        notes: formData.notes,
      });

      if (result?.message?.success) {
        toast.success('Appointment created!', {
          description: `Scheduled for ${format(startDateTime, 'MMM d, h:mm a')}`,
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Creation failed', {
          description: result?.message?.error,
        });
      }
    } catch (error: any) {
      toast.error('Creation failed', {
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
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          activeField === id ? 'text-violet-400' : 'text-gray-500'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={formData[id as keyof typeof formData]}
          onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
          onFocus={() => setActiveField(id)}
          onBlur={() => setActiveField(null)}
          className={`w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
            errors[id] 
              ? 'border-red-500/50 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20'
          }`}
          {...props}
        />
      </div>
      {errors[id] && (
        <p className="text-xs text-red-400 mt-1">{errors[id]}</p>
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
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          activeField === id ? 'text-violet-400' : 'text-gray-500'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <select
          value={formData[id as keyof typeof formData]}
          onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
          onFocus={() => setActiveField(id)}
          onBlur={() => setActiveField(null)}
          className={`w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 transition-all ${
            errors[id] 
              ? 'border-red-500/50 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20'
          }`}
        >
          <option value="" className="bg-[#1a1a24]">Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.name} value={opt.name} className="bg-[#1a1a24]">
              {opt[displayKey]}
            </option>
          ))}
        </select>
      </div>
      {errors[id] && (
        <p className="text-xs text-red-400 mt-1">{errors[id]}</p>
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
          className="relative w-full max-w-2xl bg-[#0f0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur opacity-50" />
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">New Appointment</h2>
                <p className="text-xs text-gray-500">Book a client appointment</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <InputField id="client_name" label="Client Name" icon={User} placeholder="John Doe" />
              <InputField id="client_phone" label="Phone Number" icon={Phone} placeholder="+251 9XX XXX XXX" />
            </div>

            <InputField id="client_email" label="Email Address" icon={Mail} type="email" placeholder="john@example.com" />

            {/* Service Details */}
            <div className="grid grid-cols-3 gap-4">
              <SelectField id="service_name" label="Service" icon={Briefcase} options={services} displayKey="service_name" />
              <SelectField id="provider_name" label="Provider" icon={User} options={providers} displayKey="provider_name" />
              <SelectField id="location_name" label="Location" icon={MapPin} options={locations} displayKey="location_name" />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <InputField id="appointment_date" label="Date" icon={Calendar} type="date" />
              <InputField id="start_time" label="Start Time" icon={Clock} type="time" />
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:border-violet-500/50 focus:ring-violet-500/20"
                >
                  <option value="15" className="bg-[#1a1a24]">15 min</option>
                  <option value="30" className="bg-[#1a1a24]">30 min</option>
                  <option value="45" className="bg-[#1a1a24]">45 min</option>
                  <option value="60" className="bg-[#1a1a24]">60 min</option>
                  <option value="90" className="bg-[#1a1a24]">90 min</option>
                  <option value="120" className="bg-[#1a1a24]">120 min</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-500">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-violet-500/50 focus:ring-violet-500/20 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={creating}
                className="relative group flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 group-hover:from-violet-500 group-hover:to-purple-500 transition-all" />
                {creating ? (
                  <Loader2 className="relative z-10 w-4 h-4 text-white animate-spin" />
                ) : (
                  <Sparkles className="relative z-10 w-4 h-4 text-white" />
                )}
                <span className="relative z-10 text-white">
                  {creating ? 'Creating...' : 'Create Appointment'}
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
