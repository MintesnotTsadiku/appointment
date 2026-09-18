import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Phone, Mail, MapPin, User, FileText, Loader2, Sparkles, Briefcase } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Service, Provider, Location } from '../types';

interface AddWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: Location[];
  providers: Provider[];
}

/**
 * Field components live at module scope. Defining them inside the modal made
 * React remount the controlled input on every keystroke, which dropped typed
 * values (and QA `fill` events).
 */
interface InputFieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  type?: string;
  required?: boolean;
  value: string;
  error?: string;
  active: boolean;
  onValueChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  [key: string]: any;
}

const InputField = ({
  id,
  label,
  icon: Icon,
  type = "text",
  required = false,
  value,
  error,
  active,
  onValueChange,
  onFocus,
  onBlur,
  ...props
}: InputFieldProps) => (
  <div className="relative">
    <label className="block text-xs font-medium text-gray-400 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          active ? "text-orange-400" : "text-gray-500"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
          error
            ? "border-red-500/50 focus:ring-red-500/20"
            : "border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20"
        }`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

interface SelectFieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  options: any[];
  displayKey: string;
  value: string;
  active: boolean;
  onValueChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const SelectField = ({
  id,
  label,
  icon: Icon,
  options,
  displayKey,
  value,
  active,
  onValueChange,
  onFocus,
  onBlur,
}: SelectFieldProps) => (
  <div className="relative">
    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    <div className="relative">
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          active ? "text-orange-400" : "text-gray-500"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
      >
        <option value="" className="bg-[#1a1a24]">
          Select {label.toLowerCase()}
        </option>
        {options.map((opt) => (
          <option key={opt.name} value={opt.name} className="bg-[#1a1a24]">
            {opt[displayKey]}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export const AddWalkInModal = ({
  isOpen,
  onClose,
  onSuccess,
  locations,
  providers,
}: AddWalkInModalProps) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_requested: '',
    location_name: '',
    provider_preferred: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  const { data: servicesData } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.scheduler.api.desk.get_services_list',
    undefined,
    'services'
  );

  const { call: addWalkIn, loading: creating } = useFrappePostCall(
    'appointment.scheduler.api.desk.add_walk_in'
  );

  const services = servicesData?.message?.services || [];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) newErrors.client_name = 'Required';
    if (!formData.client_phone.trim()) newErrors.client_phone = 'Required';
    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Invalid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await addWalkIn({
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email || undefined,
        service_requested: formData.service_requested || undefined,
        location_name: formData.location_name || undefined,
        provider_preferred: formData.provider_preferred || undefined,
        notes: formData.notes || undefined,
      });

      if (result?.message?.success) {
        toast.success('Walk-in added!', {
          description: 'Added to the queue successfully',
        });
        onSuccess();
        onClose();
        setFormData({
          client_name: '',
          client_phone: '',
          client_email: '',
          service_requested: '',
          location_name: '',
          provider_preferred: '',
          notes: '',
        });
      } else {
        toast.error('Failed to add walk-in', {
          description: result?.message?.error,
        });
      }
    } catch (error: any) {
      toast.error('Failed to add walk-in', {
        description: error?.message,
      });
    }
  };

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
          className="relative w-full max-w-lg bg-[#0f0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl blur opacity-50" />
                <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Add Walk-In</h2>
                <p className="text-xs text-gray-500">Add client to the queue</p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <InputField
                id="client_name"
                data-qa="walkin-client-name"
                label="Client Name"
                icon={User}
                placeholder="John Doe"
                required
                value={formData.client_name}
                error={errors.client_name}
                active={activeField === "client_name"}
                onValueChange={(value) => setFormData({ ...formData, client_name: value })}
                onFocus={() => setActiveField("client_name")}
                onBlur={() => setActiveField(null)}
              />
              <InputField
                id="client_phone"
                data-qa="walkin-client-phone"
                label="Phone"
                icon={Phone}
                placeholder="+251 9XX"
                required
                value={formData.client_phone}
                error={errors.client_phone}
                active={activeField === "client_phone"}
                onValueChange={(value) => setFormData({ ...formData, client_phone: value })}
                onFocus={() => setActiveField("client_phone")}
                onBlur={() => setActiveField(null)}
              />
            </div>

            <InputField
              id="client_email"
              label="Email"
              icon={Mail}
              type="email"
              placeholder="john@example.com"
              value={formData.client_email}
              error={errors.client_email}
              active={activeField === "client_email"}
              onValueChange={(value) => setFormData({ ...formData, client_email: value })}
              onFocus={() => setActiveField("client_email")}
              onBlur={() => setActiveField(null)}
            />

            {/* Service & Location */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="service_requested"
                label="Service"
                icon={Briefcase}
                options={services}
                displayKey="service_name"
                value={formData.service_requested}
                active={activeField === "service_requested"}
                onValueChange={(value) => setFormData({ ...formData, service_requested: value })}
                onFocus={() => setActiveField("service_requested")}
                onBlur={() => setActiveField(null)}
              />
              <SelectField
                id="location_name"
                label="Location"
                icon={MapPin}
                options={locations}
                displayKey="location_name"
                value={formData.location_name}
                active={activeField === "location_name"}
                onValueChange={(value) => setFormData({ ...formData, location_name: value })}
                onFocus={() => setActiveField("location_name")}
                onBlur={() => setActiveField(null)}
              />
            </div>

            <SelectField
              id="provider_preferred"
              label="Preferred Provider"
              icon={User}
              options={providers}
              displayKey="provider_name"
              value={formData.provider_preferred}
              active={activeField === "provider_preferred"}
              onValueChange={(value) => setFormData({ ...formData, provider_preferred: value })}
              onFocus={() => setActiveField("provider_preferred")}
              onBlur={() => setActiveField(null)}
            />

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
                  placeholder="Reason for visit, special requests..."
                  rows={2}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-orange-500/50 focus:ring-orange-500/20 resize-none"
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
                data-qa="walkin-submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={creating}
                className="relative group flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 group-hover:from-orange-400 group-hover:to-amber-400 transition-all" />
                {creating ? (
                  <Loader2 className="relative z-10 w-4 h-4 text-white animate-spin" />
                ) : (
                  <Sparkles className="relative z-10 w-4 h-4 text-white" />
                )}
                <span className="relative z-10 text-white">
                  {creating ? 'Adding...' : 'Add to Queue'}
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};






