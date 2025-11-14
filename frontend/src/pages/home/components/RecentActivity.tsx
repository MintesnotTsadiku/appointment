import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { Card } from '@/components/card';
import { useTranslation } from '@/lib/i18n';
import { CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import Spinner from '@/components/spinner';

interface Activity {
  type: 'booking' | 'cancellation' | 'reschedule' | 'noshow';
  customer: string;
  time: string;
  appointment_id: string;
  title: string;
}

const RecentActivity = () => {
  const { t } = useTranslation();

  const { data, isLoading, error } = useFrappeGetCall<{ message: { activities: Activity[] } }>(
    'frappe_appointment.dashboard.recent_activity',
    { limit: 10, offset: 0 },
    'recent-activity'
  );

  const activities = data?.message?.activities || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancellation':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'reschedule':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      case 'noshow':
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'booking':
        return 'bg-green-50 dark:bg-green-900/10';
      case 'cancellation':
        return 'bg-red-50 dark:bg-red-900/10';
      case 'reschedule':
        return 'bg-blue-50 dark:bg-blue-900/10';
      case 'noshow':
        return 'bg-orange-50 dark:bg-orange-900/10';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return t('time.justNow') || 'Just now';
      if (diffMins < 60) return `${diffMins} ${t('time.minutesAgo') || 'min ago'}`;
      if (diffHours < 24) return `${diffHours} ${t('time.hoursAgo') || 'hours ago'}`;
      if (diffDays < 7) return `${diffDays} ${t('time.daysAgo') || 'days ago'}`;
      return date.toLocaleDateString();
    } catch {
      return timeStr;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.recentActivity') || 'Recent Activity'}
        </h3>
        <button
          onClick={() => {
            // Refresh activity
            window.location.reload();
          }}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            {t('error.loadActivityFailed') || 'Failed to load activity'}
          </p>
        </div>
      )}

      {!isLoading && !error && activities.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.noActivity') || 'No recent activity'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {t('dashboard.noActivityDesc') || 'Activity will appear here once customers start booking'}
          </p>
        </div>
      )}

      {!isLoading && !error && activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={`${activity.appointment_id}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-start space-x-3 p-4 rounded-lg ${getActivityColor(
                activity.type
              )}`}
            >
              <div className="flex-shrink-0 mt-0.5">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.title || `${activity.customer} ${activity.type}`}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatTime(activity.time)}
                </p>
              </div>
              <button
                onClick={() => {
                  // Navigate to appointment details
                  alert(`View appointment ${activity.appointment_id}`);
                }}
                className="flex-shrink-0 text-xs text-brand-primary hover:text-brand-primary-dark transition-colors"
              >
                {t('common.view') || 'View'}
              </button>
            </motion.div>
          ))}

          {activities.length >= 10 && (
            <button
              onClick={() => {
                // Navigate to full activity log
                alert('View all activity - to be implemented');
              }}
              className="w-full py-3 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
            >
              {t('dashboard.viewAllActivity') || 'View All Activity →'}
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export default RecentActivity;

