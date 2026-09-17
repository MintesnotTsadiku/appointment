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
    'appointment.dashboard.admin_stats',
    undefined,
    'admin-dashboard-stats',
    {
      revalidateOnFocus: true,
    }
  );

  const stats = data?.message;

  if (isLoading) {
    return (
      <div
        className="min-h-screen text-[var(--text-primary)] flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen text-[var(--text-primary)] flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Card
          className="p-8 max-w-md backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="text-center">
            <div className="inline-flex p-3 rounded-xl bg-gradient-secondary mb-4">
              <XCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Access Denied
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              You need System Manager permissions to access the admin dashboard.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/home'}
              className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
              <ChevronLeft className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Back to Dashboard</span>
            </motion.button>
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

  const statusColors: Record<string, { bg: string; text: string }> = {
    'Pending': { bg: 'var(--accent-secondary-light)', text: 'var(--accent-secondary)' },
    'Confirmed': { bg: 'var(--accent-primary-light)', text: 'var(--accent-primary)' },
    'Completed': { bg: 'var(--accent-success-light)', text: 'var(--accent-success)' },
    'Cancelled': { bg: 'var(--accent-secondary-light)', text: 'var(--accent-secondary)' },
    'No Show': { bg: 'var(--border-subtle)', text: 'var(--text-muted)' },
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
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
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
                  onClick={() => window.location.href = '/home'}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Admin Dashboard
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                        style={{
                          background: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary-light)'
                        }}
                      >
                        ADMIN
                      </span>
                    </h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Platform-wide analytics and insights
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                Refresh
              </motion.button>
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
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
            <Card
              className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Total Providers</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {safeStats.overview.total_providers}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                    {safeStats.overview.active_providers} active
                  </p>
                </div>
                <div className="inline-flex p-3 rounded-xl bg-gradient-primary">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
            <Card
              className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Organizations</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {safeStats.overview.total_organizations}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                    {safeStats.overview.active_organizations} active
                  </p>
                </div>
                <div className="inline-flex p-3 rounded-xl bg-gradient-secondary">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
            <Card
              className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Appointments (Month)</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {safeStats.overview.appointments_this_month}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {safeStats.appointments.growth >= 0 ? (
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
                    )}
                    <span className="text-xs" style={{ color: safeStats.appointments.growth >= 0 ? 'var(--accent-success)' : 'var(--accent-secondary)' }}>
                      {Math.abs(safeStats.appointments.growth)}%
                    </span>
                  </div>
                </div>
                <div className="inline-flex p-3 rounded-xl bg-gradient-primary">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
            <Card
              className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Revenue (Month)</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {safeStats.revenue.this_month.toLocaleString()} ETB
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {safeStats.revenue.growth >= 0 ? (
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
                    )}
                    <span className="text-xs" style={{ color: safeStats.revenue.growth >= 0 ? 'var(--accent-success)' : 'var(--accent-secondary)' }}>
                      {Math.abs(safeStats.revenue.growth)}%
                    </span>
                  </div>
                </div>
                <div className="inline-flex p-3 rounded-xl bg-gradient-success">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            className="p-4 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Services</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {safeStats.overview.total_services}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="p-4 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2 rounded-lg bg-gradient-secondary">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Locations</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {safeStats.overview.total_locations}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="p-4 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2 rounded-lg bg-gradient-success">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Users</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {safeStats.overview.active_users}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="p-4 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This Week</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {safeStats.overview.appointments_this_week}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Appointment Status Breakdown */}
          <Card
            className="p-6 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Appointment Status
            </h2>
            <div className="space-y-3">
              {Object.entries(safeStats.appointments.status_breakdown).map(([status, count]) => {
                const statusColor = statusColors[status] || { bg: 'var(--border-subtle)', text: 'var(--text-muted)' };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text
                        }}
                      >
                        {getStatusIcon(status)}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {status}
                      </span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Providers */}
          <Card
            className="p-6 backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Top Providers (This Month)
            </h2>
            <div className="space-y-3">
              {safeStats.top_providers.length > 0 ? (
                safeStats.top_providers.map((provider, index) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {provider.provider_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {provider.appointment_count} appointments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>
                        {(provider.total_revenue || 0).toLocaleString()} ETB
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-subtle)' }}>
                  No provider data available
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card
          className="p-6 backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Appointment ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Provider
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {safeStats.recent_activity.length > 0 ? (
                  safeStats.recent_activity.map((activity) => {
                    const statusColor = statusColors[activity.status] || { bg: 'var(--border-subtle)', text: 'var(--text-muted)' };
                    return (
                      <tr
                        key={activity.id}
                        className="border-b hover:bg-[var(--border-subtle)] transition-colors"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <td className="py-3 px-4 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                          {activity.id}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {activity.client_name}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {activity.provider}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text
                            }}
                          >
                            {getStatusIcon(activity.status)}
                            {activity.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {activity.date && new Date(activity.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold" style={{ color: 'var(--accent-success)' }}>
                          {activity.amount > 0 ? `${(activity.amount || 0).toLocaleString()} ETB` : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-subtle)' }}>
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
    </div>
  );
};

export default AdminDashboard;

