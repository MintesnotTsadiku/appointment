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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your business performance
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' 
                  }}>
                    <stat.icon className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <span className={`text-sm font-medium ${
                    stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bookings Trend
              </h3>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">Chart coming soon</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Overview
              </h3>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">Chart coming soon</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-8 text-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-900 rounded-full mb-4">
              <BarChart3 className="w-10 h-10" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Advanced Analytics Coming Soon!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
              We're building comprehensive analytics with beautiful charts, customer insights, 
              revenue forecasting, and actionable recommendations to grow your business.
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/home'}
              >
                Back to Dashboard
              </Button>
              <Button 
                style={{ background: 'var(--brand-primary)' }}
                className="text-white"
              >
                Request Early Access
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Analytics;


