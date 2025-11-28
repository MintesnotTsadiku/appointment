import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { Calendar, Clock, TrendingUp, TrendingDown, DollarSign, Sparkles } from 'lucide-react';

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
      title: 'This Week',
      value: stats.appointments_this_week,
      subtitle: 'appointments',
      icon: Calendar,
      gradient: 'bg-gradient-primary',
    },
    {
      title: 'Today',
      value: stats.upcoming_today,
      subtitle: 'upcoming',
      icon: Clock,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      title: 'Booking Rate',
      value: `${stats.booking_rate_change > 0 ? '+' : ''}${stats.booking_rate_change}%`,
      subtitle: 'vs last week',
      icon: stats.booking_rate_change >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.booking_rate_change >= 0 ? 'bg-gradient-success' : 'bg-gradient-to-br from-red-500 to-rose-600',
      trend: stats.booking_rate_change >= 0 ? 'up' : 'down',
    },
    {
      title: 'Revenue',
      value: stats.revenue > 1000 ? `${(stats.revenue / 1000).toFixed(1)}k` : stats.revenue,
      subtitle: 'ETB this week',
      icon: DollarSign,
      gradient: 'bg-gradient-secondary',
    },
  ];

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Quick Stats
          </h2>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="relative backdrop-blur-sm rounded-2xl p-5 animate-pulse"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl"
                  style={{ backgroundColor: 'var(--border-default)' }}
                />
                <div className="flex-1">
                  <div 
                    className="h-6 rounded w-16 mb-2"
                    style={{ backgroundColor: 'var(--border-default)' }}
                  />
                  <div 
                    className="h-3 rounded w-20"
                    style={{ backgroundColor: 'var(--border-default)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="relative backdrop-blur-sm rounded-2xl p-6"
        style={{ 
          backgroundColor: 'var(--border-subtle)',
          border: '1px solid var(--border-default)'
        }}
      >
        <p style={{ color: 'var(--status-cancelled)' }}>
          Failed to load stats
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Quick Stats
        </h2>
        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative group"
          >
            {/* Hover glow effect */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
              style={{ 
                background: `linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))`,
                opacity: 0
              }}
            />
            
            <div 
              className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center gap-3">
                {/* Gradient Icon */}
                <div className={`inline-flex p-2.5 rounded-xl ${stat.gradient}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Value */}
                  <motion.div
                    key={String(stat.value)}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl lg:text-3xl font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {typeof stat.value === 'number' && stat.value > 1000
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </motion.div>
                  
                  {/* Label */}
                  <div 
                    className="text-xs lg:text-sm mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {stat.title}
                  </div>
                </div>
              </div>
              
              {/* Subtitle with trend indicator */}
              {stat.subtitle && (
                <div className="mt-3 flex items-center gap-1.5">
                  {stat.trend && (
                    <span 
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {stat.subtitle}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuickStats;
