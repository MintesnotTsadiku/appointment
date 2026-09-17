import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Activity,
  ExternalLink,
  Inbox
} from 'lucide-react';
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

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: { activities: Activity[] } }>(
    'appointment.dashboard.recent_activity',
    { limit: 10, offset: 0 },
    'recent-activity'
  );

  const activities = data?.message?.activities || [];

  const getActivityIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'booking':
        return <CheckCircle className={iconClass} style={{ color: 'var(--accent-success)' }} />;
      case 'cancellation':
        return <XCircle className={iconClass} style={{ color: 'var(--status-cancelled)' }} />;
      case 'reschedule':
        return <RefreshCw className={iconClass} style={{ color: 'var(--status-pending)' }} />;
      case 'noshow':
        return <Clock className={iconClass} style={{ color: 'var(--accent-warning)' }} />;
      default:
        return <CheckCircle className={iconClass} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getActivityGradient = (type: string) => {
    switch (type) {
      case 'booking':
        return 'bg-gradient-success';
      case 'cancellation':
        return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'reschedule':
        return 'bg-gradient-to-br from-blue-500 to-indigo-600';
      case 'noshow':
        return 'bg-gradient-secondary';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
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

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return timeStr;
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
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => mutate()}
          className="p-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: 'var(--border-default)',
            color: 'var(--text-muted)'
          }}
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </motion.button>
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
              Failed to load activity
            </p>
          </div>
        )}

        {!isLoading && !error && activities.length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--border-default)' }}
            >
              <Inbox className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              No recent activity
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Activity will appear here once customers start booking
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
                className="group flex items-start gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.01]"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {/* Activity Icon with gradient background */}
                <div 
                  className={`flex-shrink-0 p-2 rounded-lg ${getActivityGradient(activity.type)}`}
                >
                  <span className="text-white">
                    {getActivityIcon(activity.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {activity.title || `${activity.customer} ${activity.type}`}
                  </p>
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatTime(activity.time)}
                  </p>
                </div>

                {/* View Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Navigate to appointment details
                    console.log(`View appointment ${activity.appointment_id}`);
                  }}
                  className="flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ 
                    backgroundColor: 'var(--accent-primary-light)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}

            {activities.length >= 10 && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  // Navigate to full activity log
                  console.log('View all activity');
                }}
                className="w-full py-3 text-sm font-medium rounded-xl transition-all"
                style={{ 
                  backgroundColor: 'var(--border-default)',
                  color: 'var(--accent-primary)'
                }}
              >
                View All Activity →
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
