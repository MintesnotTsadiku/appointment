import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle, 
  X, 
  Bell,
  ArrowRight,
  PartyPopper
} from 'lucide-react';
import Spinner from '@/components/spinner';

interface Alert {
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  priority: number;
  action_url?: string;
  dismissible: boolean;
}

const AlertsPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: { alerts: Alert[] } }>(
    'frappe_appointment.dashboard.alerts',
    undefined,
    'dashboard-alerts'
  );

  const alerts = (data?.message?.alerts || [])
    .filter((alert, index) => !dismissedAlerts.has(`${alert.message}-${index}`))
    .sort((a, b) => b.priority - a.priority);

  const getAlertIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'info':
        return <Info className={iconClass} />;
      case 'success':
        return <CheckCircle className={iconClass} />;
      case 'error':
        return <XCircle className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getAlertGradient = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-gradient-secondary';
      case 'info':
        return 'bg-gradient-to-br from-blue-500 to-indigo-600';
      case 'success':
        return 'bg-gradient-success';
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-rose-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  const getAlertBorderColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'var(--accent-warning)';
      case 'info':
        return 'var(--status-pending)';
      case 'success':
        return 'var(--accent-success)';
      case 'error':
        return 'var(--status-cancelled)';
      default:
        return 'var(--border-default)';
    }
  };

  const handleDismiss = (alert: Alert, index: number) => {
    const alertKey = `${alert.message}-${index}`;
    setDismissedAlerts(new Set(dismissedAlerts).add(alertKey));
  };

  const handleAction = (actionUrl: string) => {
    if (actionUrl.startsWith('/')) {
      navigate(actionUrl);
    } else {
      window.location.href = actionUrl;
    }
  };

  return (
    <div 
      className="relative backdrop-blur-sm rounded-2xl overflow-hidden"
      style={{ 
        backgroundColor: 'var(--border-subtle)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-5"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-secondary">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Alerts & Notifications
          </h3>
        </div>
        {alerts.length > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2.5 py-1 text-xs font-semibold rounded-full text-white bg-gradient-primary"
          >
            {alerts.length}
          </motion.span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p style={{ color: 'var(--status-cancelled)' }}>
              Failed to load alerts
            </p>
          </div>
        )}

        {!isLoading && !error && alerts.length === 0 && (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-success"
            >
              <PartyPopper className="w-8 h-8 text-white" />
            </motion.div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              You're all set! ✨
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              No alerts or issues to address
            </p>
          </div>
        )}

        {!isLoading && !error && alerts.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {alerts.map((alert, index) => (
                <motion.div
                  key={`${alert.message}-${index}`}
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group relative rounded-xl p-4 transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    borderLeft: `3px solid ${getAlertBorderColor(alert.type)}`,
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div 
                      className={`flex-shrink-0 p-2 rounded-lg ${getAlertGradient(alert.type)}`}
                    >
                      <span className="text-white">
                        {getAlertIcon(alert.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {alert.message}
                      </p>
                      
                      {alert.action_url && (
                        <motion.button
                          whileHover={{ x: 3 }}
                          onClick={() => handleAction(alert.action_url!)}
                          className="mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          Take Action
                          <ArrowRight className="w-3 h-3" />
                        </motion.button>
                      )}
                    </div>

                    {/* Dismiss Button */}
                    {alert.dismissible && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDismiss(alert, index)}
                        className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ 
                          backgroundColor: 'var(--border-default)',
                          color: 'var(--text-muted)'
                        }}
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
