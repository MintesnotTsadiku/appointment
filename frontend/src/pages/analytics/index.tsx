import { motion } from 'framer-motion';
import { 
  BarChart3, 
  ChevronLeft,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Download
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';

const Analytics = () => {
  const stats = [
    { label: 'Total Bookings', value: '0', icon: Calendar, change: '+0%', positive: true },
    { label: 'Total Revenue', value: '0 ETB', icon: DollarSign, change: '+0%', positive: true },
    { label: 'Unique Customers', value: '0', icon: Users, change: '+0%', positive: true },
    { label: 'Avg. Booking Value', value: '0 ETB', icon: TrendingUp, change: '+0%', positive: false },
  ];

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header 
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.history.back()}
                  className="p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Analytics Dashboard
                      <span 
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                        style={{ 
                          background: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary-light)'
                        }}
                      >
                        PRO
                      </span>
                    </h1>
                    <p className="text-xs lg:text-sm" style={{ color: 'var(--text-subtle)' }}>
                      Track your business performance
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  className="px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                </select>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const gradients = [
                'bg-gradient-primary',
                'bg-gradient-to-br from-blue-500 to-indigo-600',
                'bg-gradient-success',
                'bg-gradient-secondary'
              ];
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div 
                    className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex p-2.5 rounded-xl ${gradients[index] || gradients[0]}`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <span 
                        className="text-sm font-medium"
                        style={{ 
                          color: stat.positive ? 'var(--accent-success)' : 'var(--status-cancelled)'
                        }}
                      >
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                      {stat.value}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div 
                className="rounded-2xl p-6 backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Bookings Trend
                </h3>
                <div 
                  className="h-64 flex items-center justify-center border-2 border-dashed rounded-xl"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chart coming soon</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div 
                className="rounded-2xl p-6 backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Revenue Overview
                </h3>
                <div 
                  className="h-64 flex items-center justify-center border-2 border-dashed rounded-xl"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <div className="text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chart coming soon</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div 
              className="rounded-2xl p-8 text-center backdrop-blur-sm"
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary-light), var(--border-subtle))',
                border: '1px solid var(--accent-primary-light)'
              }}
            >
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 backdrop-blur-sm"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <BarChart3 className="w-10 h-10" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                Advanced Analytics Coming Soon!
              </h3>
              <p className="max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-muted)' }}>
                We're building comprehensive analytics with beautiful charts, customer insights, 
                revenue forecasting, and actionable recommendations to grow your business.
              </p>
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/home'}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Back to Dashboard
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-primary"
                >
                  Request Early Access
                </motion.button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;


