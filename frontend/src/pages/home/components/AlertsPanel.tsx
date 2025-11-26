import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/card';
import { useTranslation } from '@/lib/i18n';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
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
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    }
  };

  const handleDismiss = (alert: Alert, index: number) => {
    const alertKey = `${alert.message}-${index}`;
    setDismissedAlerts(new Set(dismissedAlerts).add(alertKey));
  };

  const handleAction = (actionUrl: string) => {
    // Use React Router navigation for internal routes
    if (actionUrl.startsWith('/')) {
      navigate(actionUrl);
    } else {
      // External URLs use window.location
    window.location.href = actionUrl;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Alerts & Notifications
        </h3>
        {alerts.length > 0 && (
          <span className="px-2 py-1 bg-brand-primary text-white text-xs font-medium rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            Failed to load alerts
          </p>
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium">
            You're all set!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                    {alert.action_url && (
                      <button
                        onClick={() => handleAction(alert.action_url!)}
                        className="mt-2 text-xs font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
                      >
                        Take Action →
                      </button>
                    )}
                  </div>
                  {alert.dismissible && (
                    <button
                      onClick={() => handleDismiss(alert, index)}
                      className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
};

export default AlertsPanel;

