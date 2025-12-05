import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, MapPin, Briefcase, Edit } from 'lucide-react';
import { Appointment } from '../types';
import { format, parseISO } from 'date-fns';

interface OverflowAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  appointments: Appointment[];
  onEdit?: (appointment: Appointment) => void;
  onNavigateToDay?: (date: Date) => void;
  viewMode: 'day' | 'week';
}

export const OverflowAppointmentsModal = ({
  isOpen,
  onClose,
  date,
  appointments,
  onEdit,
  onNavigateToDay,
  viewMode,
}: OverflowAppointmentsModalProps) => {
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, { color: string; bg: string }> = {
      'Pending': { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' },
      'Confirmed': { color: 'var(--status-confirmed)', bg: 'var(--status-confirmed-bg)' },
      'Completed': { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)' },
      'Cancelled': { color: 'var(--status-cancelled)', bg: 'var(--status-cancelled-bg)' },
      'No Show': { color: 'var(--status-no-show)', bg: 'var(--status-no-show-bg)' },
      'In Progress': { color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' },
    };
    return statusMap[status] || { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)' };
  };

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
          className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''} on {format(date, 'MMM d, yyyy')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {format(date, 'EEEE')}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {viewMode === 'week' && onNavigateToDay && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNavigateToDay(date);
                  onClose();
                }}
                className="w-full mb-4 p-3 rounded-xl font-medium text-sm transition-all"
                style={{ 
                  background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                  color: 'white'
                }}
              >
                View Day View for {format(date, 'MMM d')}
              </motion.button>
            )}

            <div className="space-y-3">
              {appointments.map((appointment, index) => {
                const statusVars = getStatusColor(appointment.status);
                const startTime = appointment.start_time?.substring(0, 5) || '00:00';
                const endTime = appointment.end_time?.substring(0, 5) || '00:00';

                return (
                  <motion.div
                    key={appointment.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl transition-all hover:scale-[1.01] group"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      border: `1px solid var(--border-default)`
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Status and Time */}
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusVars.color }}
                          />
                          <span 
                            className="text-xs font-medium"
                            style={{ color: statusVars.color }}
                          >
                            {appointment.status}
                          </span>
                          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Clock className="w-3 h-3" />
                            <span>{startTime} - {endTime}</span>
                          </div>
                        </div>

                        {/* Client Name */}
                        <h3 
                          className="font-semibold text-base mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {appointment.client_name}
                        </h3>

                        {/* Service and Provider */}
                        <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>{appointment.service_name}</span>
                          </div>
                          {appointment.provider_name && (
                            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              <User className="w-3.5 h-3.5" />
                              <span>{appointment.provider_name}</span>
                            </div>
                          )}
                          {appointment.location_name && (
                            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{appointment.location_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {appointment.notes && (
                          <p 
                            className="text-xs mt-2"
                            style={{ color: 'var(--text-subtle)' }}
                          >
                            {appointment.notes}
                          </p>
                        )}
                      </div>

                      {/* Edit Button */}
                      {onEdit && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            onEdit(appointment);
                            onClose();
                          }}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)'
                          }}
                          title="Edit appointment"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};





