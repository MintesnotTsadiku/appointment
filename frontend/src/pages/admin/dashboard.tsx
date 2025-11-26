import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { Card } from '@/components/card';
import { 
  Users, 
  Building2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Briefcase,
  MapPin,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Spinner from '@/components/spinner';
import { Button } from '@/components/button';
import { ChevronLeft } from 'lucide-react';

interface AdminStats {
  overview: {
    total_providers: number;
    active_providers: number;
    total_organizations: number;
    active_organizations: number;
    total_appointments: number;
    appointments_this_week: number;
    appointments_this_month: number;
    appointment_growth: number;
    total_services: number;
    total_locations: number;
    active_users: number;
  };
  revenue: {
    total: number;
    this_month: number;
    last_month: number;
    growth: number;
  };
  appointments: {
    status_breakdown: Record<string, number>;
    this_week: number;
    this_month: number;
    growth: number;
  };
  recent_activity: Array<{
    id: string;
    client_name: string;
    provider: string;
    status: string;
    date: string;
    time: string;
    amount: number;
    created_at: string;
  }>;
  top_providers: Array<{
    name: string;
    provider_name: string;
    appointment_count: number;
    total_revenue: number;
  }>;
}

const AdminDashboard = () => {
  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: AdminStats }>(
    'frappe_appointment.dashboard.admin_stats',
    undefined,
    'admin-dashboard-stats',
    {
      revalidateOnFocus: true,
    }
  );

  const stats = data?.message;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You need System Manager permissions to access the admin dashboard.
            </p>
            <Button onClick={() => window.location.href = '/home'}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Ensure all stats have default values to prevent undefined errors
  const safeStats = {
    overview: {
      total_providers: stats.overview?.total_providers || 0,
      active_providers: stats.overview?.active_providers || 0,
      total_organizations: stats.overview?.total_organizations || 0,
      active_organizations: stats.overview?.active_organizations || 0,
      total_appointments: stats.overview?.total_appointments || 0,
      appointments_this_week: stats.overview?.appointments_this_week || 0,
      appointments_this_month: stats.overview?.appointments_this_month || 0,
      appointment_growth: stats.overview?.appointment_growth || 0,
      total_services: stats.overview?.total_services || 0,
      total_locations: stats.overview?.total_locations || 0,
      active_users: stats.overview?.active_users || 0,
    },
    revenue: {
      total: stats.revenue?.total || 0,
      this_month: stats.revenue?.this_month || 0,
      last_month: stats.revenue?.last_month || 0,
      growth: stats.revenue?.growth || 0,
    },
    appointments: {
      status_breakdown: stats.appointments?.status_breakdown || {},
      this_week: stats.appointments?.this_week || 0,
      this_month: stats.appointments?.this_month || 0,
      growth: stats.appointments?.growth || 0,
    },
    recent_activity: stats.recent_activity || [],
    top_providers: stats.top_providers || [],
  };

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'No Show': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

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
                onClick={() => window.location.href = '/home'}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Platform-wide analytics and insights
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => mutate()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Providers</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeStats.overview.total_providers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {safeStats.overview.active_providers} active
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Organizations</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeStats.overview.total_organizations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {safeStats.overview.active_organizations} active
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Appointments (Month)</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeStats.overview.appointments_this_month}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {safeStats.appointments.growth >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${safeStats.appointments.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(safeStats.appointments.growth)}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue (Month)</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeStats.revenue.this_month.toLocaleString()} ETB
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {safeStats.revenue.growth >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${safeStats.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(safeStats.revenue.growth)}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Services</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {safeStats.overview.total_services}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Locations</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {safeStats.overview.total_locations}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {safeStats.overview.active_users}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {safeStats.overview.appointments_this_week}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Appointment Status Breakdown */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Appointment Status
            </h2>
            <div className="space-y-3">
              {Object.entries(safeStats.appointments.status_breakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusColors[status] || 'bg-gray-100 dark:bg-gray-800'}`}>
                      {getStatusIcon(status)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {status}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Providers */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Providers (This Month)
            </h2>
            <div className="space-y-3">
              {safeStats.top_providers.length > 0 ? (
                safeStats.top_providers.map((provider, index) => (
                  <div key={provider.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {provider.provider_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {provider.appointment_count} appointments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {(provider.total_revenue || 0).toLocaleString()} ETB
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No provider data available
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Appointment ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Provider
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {safeStats.recent_activity.length > 0 ? (
                  safeStats.recent_activity.map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-mono">
                        {activity.id}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {activity.client_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {activity.provider}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[activity.status] || 'bg-gray-100 dark:bg-gray-800'}`}>
                          {getStatusIcon(activity.status)}
                          {activity.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {activity.date && new Date(activity.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {activity.amount > 0 ? `${(activity.amount || 0).toLocaleString()} ETB` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;

