import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { Card } from '@/components/card';
import { useTranslation } from '@/lib/i18n';
import { Calendar, Clock, TrendingUp, DollarSign } from 'lucide-react';
import Spinner from '@/components/spinner';

interface DashboardStats {
  appointments_this_week: number;
  upcoming_today: number;
  booking_rate_change: number;
  revenue: number;
}

const QuickStats = () => {
  const { t } = useTranslation();

  const { data, isLoading, error } = useFrappeGetCall<{ message: DashboardStats }>(
    'frappe_appointment.dashboard.stats',
    { period: 'week' },
    'dashboard-stats',
    {
      revalidateOnFocus: true,
    }
  );

  const stats = data?.message || {
    appointments_this_week: 0,
    upcoming_today: 0,
    booking_rate_change: 0,
    revenue: 0,
  };

  const statCards = [
    {
      title: t('dashboard.stats.thisWeek') || 'This Week',
      value: stats.appointments_this_week,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: t('dashboard.stats.today') || 'Today',
      value: stats.upcoming_today,
      subtitle: t('dashboard.stats.upcoming') || 'upcoming',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: t('dashboard.stats.bookingRate') || 'Booking Rate',
      value: `${stats.booking_rate_change > 0 ? '+' : ''}${stats.booking_rate_change}%`,
      icon: TrendingUp,
      color: stats.booking_rate_change >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor:
        stats.booking_rate_change >= 0
          ? 'bg-green-100 dark:bg-green-900/30'
          : 'bg-red-100 dark:bg-red-900/30',
      trend: stats.booking_rate_change >= 0 ? 'up' : 'down',
    },
    {
      title: t('dashboard.stats.revenue') || 'Revenue',
      value: stats.revenue,
      suffix: ' ETB',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600 dark:text-red-400">
          {t('error.loadStatsFailed') || 'Failed to load stats'}
        </p>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('dashboard.quickStats') || 'Quick Stats'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <motion.p
                      key={stat.value}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-3xl font-bold ${stat.color}`}
                    >
                      {typeof stat.value === 'number' && stat.value > 1000
                        ? stat.value.toLocaleString()
                        : stat.value}
                      {stat.suffix}
                    </motion.p>
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                  {stat.trend && (
                    <div className="mt-2 flex items-center space-x-1">
                      {stat.trend === 'up' ? (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                          />
                        </svg>
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('dashboard.stats.vsLastWeek') || 'vs last week'}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuickStats;

