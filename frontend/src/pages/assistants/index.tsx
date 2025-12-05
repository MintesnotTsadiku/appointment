import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, UserCircle, Link as LinkIcon, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/card';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { AssignmentStatistics } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

const AssistantsDashboard = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaCount, setVACount] = useState(0);
  const [clientCount, setClientCount] = useState(0);

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

      // Load counts
      const vaResponse = await assistantAPI.vaProfile.list({ page_length: 1 });
      if (vaResponse.success) {
        setVACount(vaResponse.total || 0);
      }

      const clientResponse = await assistantAPI.clientProfile.list({ page_length: 1 });
      if (clientResponse.success) {
        setClientCount(clientResponse.total || 0);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary" />
                <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1
                  className="text-xl lg:text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Assistants Dashboard
                </h1>
                <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                  Manage virtual assistants and client relationships
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/va-profiles')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">VA Profiles</p>
                        <p className="text-3xl font-bold">{vaCount}</p>
                      </div>
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/client-profiles')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client Profiles</p>
                        <p className="text-3xl font-bold">{clientCount}</p>
                      </div>
                      <UserCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/assignments')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Active Assignments</p>
                        <p className="text-3xl font-bold">{statistics?.by_status.active || 0}</p>
                      </div>
                      <LinkIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    className="p-6"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Assignments</p>
                        <p className="text-3xl font-bold">{statistics?.total || 0}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/va-profiles')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-primary p-3 rounded-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Manage VA Profiles</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage virtual assistant profiles
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/client-profiles')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-primary p-3 rounded-lg">
                        <UserCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Manage Client Profiles</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage client profiles
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                    onClick={() => navigate('/assistants/assignments')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-primary p-3 rounded-lg">
                        <LinkIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Manage Assignments</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage client-assistant assignments
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AssistantsDashboard;


