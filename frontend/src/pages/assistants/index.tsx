import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCircle,
  Link as LinkIcon,
  TrendingUp,
  Plus,
  Sparkles,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';
import { Card } from '@/components/card';
import { AssistantsHeader } from './components/AssistantsHeader';
import { StatsRow } from './components/StatsRow';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type {
  AssignmentStatistics,
  VAProfile,
  ClientProfile,
  AssistantClientAssignment,
} from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

const AssistantsDashboard = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaProfiles, setVAProfiles] = useState<VAProfile[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [assignments, setAssignments] = useState<AssistantClientAssignment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load statistics
      const statsResponse = await assistantAPI.assignment.getStatistics();
      if (statsResponse.success && statsResponse.data) {
        setStatistics(statsResponse.data);
      }

      // Load VA profiles
      const vaResponse = await assistantAPI.vaProfile.list({
        page_length: 100,
        order_by: 'modified desc',
      });
      if (vaResponse.success && vaResponse.data) {
        setVAProfiles(vaResponse.data);
      }

      // Load client profiles
      const clientResponse = await assistantAPI.clientProfile.list({
        page_length: 100,
        order_by: 'modified desc',
      });
      if (clientResponse.success && clientResponse.data) {
        setClientProfiles(clientResponse.data);
      }

      // Load assignments
      const assignResponse = await assistantAPI.assignment.list({
        page_length: 50,
        order_by: 'modified desc',
      });
      if (assignResponse.success && assignResponse.data) {
        setAssignments(assignResponse.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const activeVAs = vaProfiles.filter((va) => va.status === 'active').length;
  const activeClients = clientProfiles.filter((c) => c.status === 'active').length;

  const stats = [
    {
      label: 'Total VAs',
      value: vaProfiles.length,
      icon: Users,
      gradient: 'bg-gradient-primary',
      onClick: () => navigate('/assistants/va-profiles'),
    },
    {
      label: 'Active VAs',
      value: activeVAs,
      icon: CheckCircle2,
      gradient: 'bg-gradient-success',
      onClick: () => navigate('/assistants/va-profiles'),
    },
    {
      label: 'Total Clients',
      value: clientProfiles.length,
      icon: UserCircle,
      gradient: 'bg-gradient-secondary',
      onClick: () => navigate('/assistants/client-profiles'),
    },
    {
      label: 'Active Clients',
      value: activeClients,
      icon: TrendingUp,
      customGradient: 'from-blue-500 to-indigo-600',
      onClick: () => navigate('/assistants/client-profiles'),
    },
    {
      label: 'Active Assignments',
      value: statistics?.by_status.active || 0,
      icon: LinkIcon,
      customGradient: 'from-teal-500 to-emerald-600',
      onClick: () => navigate('/assistants/assignments'),
    },
    {
      label: 'Paused',
      value: statistics?.by_status.inactive || 0,
      icon: PauseCircle,
      customGradient: 'from-gray-500 to-gray-600',
      onClick: () => navigate('/assistants/assignments'),
    },
  ];

  const quickActions = [
    {
      title: 'Manage VA Profiles',
      description: 'View and manage virtual assistant profiles, skills, and availability',
      icon: Users,
      gradient: 'bg-gradient-primary',
      path: '/assistants/va-profiles',
    },
    {
      title: 'Manage Client Profiles',
      description: 'View and manage client profiles and their information',
      icon: UserCircle,
      gradient: 'bg-gradient-secondary',
      path: '/assistants/client-profiles',
    },
    {
      title: 'Manage Assignments',
      description: 'View and manage VA-to-client assignments and relationships',
      icon: LinkIcon,
      gradient: 'bg-gradient-success',
      path: '/assistants/assignments',
    },
  ];

  // Get recent activity (last 5 modified items across profiles and assignments)
  const recentActivity = [
    ...vaProfiles.slice(0, 3).map((va) => ({
      type: 'va' as const,
      name: va.full_name,
      action: 'VA profile updated',
      time: va.modified,
    })),
    ...clientProfiles.slice(0, 3).map((client) => ({
      type: 'client' as const,
      name: client.full_name,
      action: 'Client profile updated',
      time: client.modified,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 5);

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
        <AssistantsHeader
          title="Assistants"
          subtitle="Workforce Management System"
          icon={Users}
          actions={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/assistants/assignments')}
              className="relative group flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl font-medium text-xs lg:text-sm overflow-hidden"
            >
              <div className="absolute inset-0 transition-all bg-gradient-primary group-hover:opacity-90" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                  className="absolute inset-0 blur-xl"
                  style={{
                    background:
                      'linear-gradient(to right, var(--accent-primary), var(--accent-primary-hover))',
                  }}
                />
              </div>
              <Plus className="relative z-10 w-4 h-4 text-white" />
              <span className="relative z-10 text-white hidden sm:inline">
                New Assignment
              </span>
              <span className="relative z-10 text-white sm:hidden">New</span>
              <Sparkles className="relative z-10 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block" />
            </motion.button>
          }
        />

        {/* Main Content */}
        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Row */}
              <StatsRow stats={stats} />

              {/* Quick Actions + Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                  <h2
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <Card
                          className="group p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300 h-full"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                          }}
                          onClick={() => navigate(action.path)}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`${action.gradient} p-2.5 rounded-lg`}>
                                <action.icon className="w-5 h-5 text-white" />
                              </div>
                              <ArrowRight
                                className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--text-muted)' }}
                              />
                            </div>
                            <h3
                              className="font-semibold mb-1"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {action.title}
                            </h3>
                            <p
                              className="text-sm flex-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {action.description}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1">
                  <h2
                    className="text-sm font-semibold uppercase tracking-wider mb-4"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Recent Activity
                  </h2>
                  <Card
                    className="p-4"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((item, index) => (
                          <motion.div
                            key={`${item.type}-${item.name}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <div
                              className={`p-1.5 rounded-lg ${
                                item.type === 'va'
                                  ? 'bg-gradient-primary'
                                  : 'bg-gradient-secondary'
                              }`}
                            >
                              {item.type === 'va' ? (
                                <Users className="w-3 h-3 text-white" />
                              ) : (
                                <UserCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {item.name}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {item.action}
                              </p>
                            </div>
                            <Clock
                              className="w-3 h-3 flex-shrink-0 mt-1"
                              style={{ color: 'var(--text-subtle)' }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="text-center py-6"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent activity</p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Assignment Model Distribution */}
              {statistics && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2
                    className="text-sm font-semibold uppercase tracking-wider mb-4"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Assignment Model Distribution
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        model: '1:1',
                        label: 'Dedicated',
                        description: 'One VA per client',
                        count: statistics.by_model['1:1'],
                        color: 'bg-gradient-primary',
                      },
                      {
                        model: '1:2',
                        label: 'Shared (2)',
                        description: 'One VA for two clients',
                        count: statistics.by_model['1:2'],
                        color: 'bg-gradient-secondary',
                      },
                      {
                        model: '1:3',
                        label: 'Shared (3)',
                        description: 'One VA for three clients',
                        count: statistics.by_model['1:3'],
                        color: 'bg-gradient-success',
                      },
                    ].map((item, index) => (
                      <motion.div
                        key={item.model}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <Card
                          className="p-5 relative overflow-hidden"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`${item.color} text-white text-xs font-bold px-2 py-1 rounded`}
                            >
                              {item.model}
                            </span>
                            <span
                              className="text-3xl font-bold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {item.count}
                            </span>
                          </div>
                          <h3
                            className="font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.label}
                          </h3>
                          <p
                            className="text-sm"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {item.description}
                          </p>
                          {/* Decorative element */}
                          <div
                            className={`absolute -right-4 -bottom-4 w-24 h-24 ${item.color} opacity-5 rounded-full blur-xl`}
                          />
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AssistantsDashboard;
