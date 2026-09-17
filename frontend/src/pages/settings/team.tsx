import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  ChevronLeft,
  Plus,
  Mail,
  Shield,
  MoreVertical,
  Building2,
  User
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useFrappeGetCall } from 'frappe-react-sdk';

const TeamManagement = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Get onboarding progress to determine context
  const { data: progressData } = useFrappeGetCall<{
    message: {
      onboarding_type: 'individual' | 'organization' | null;
      selected_organization?: { name: string; organization_name: string; slug: string } | null;
    }
  }>(
    'appointment.onboarding.get_progress',
    undefined,
    'onboarding-progress'
  );

  const onboardingType = progressData?.message?.onboarding_type;
  const selectedOrg = progressData?.message?.selected_organization;
  
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Team Management
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
                    <div className="flex items-center gap-2 mt-1">
                      {onboardingType === 'organization' && selectedOrg ? (
                        <>
                          <Building2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-xs lg:text-sm" style={{ color: 'var(--text-subtle)' }}>
                            {selectedOrg.organization_name}
                          </p>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-xs lg:text-sm" style={{ color: 'var(--text-subtle)' }}>
                            Individual Provider
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInviteModal(true)}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                <Plus className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Invite Member</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div 
                className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-primary">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      1
                    </div>
                    <div className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Total Members
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Owner only
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <div 
                className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-success">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      1
                    </div>
                    <div className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Active Providers
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Accepting bookings
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <div 
                className="relative backdrop-blur-sm rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-secondary">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      0
                    </div>
                    <div className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Pending Invites
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Waiting response
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        {/* Team Members List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Team Members
              </h2>
            </div>

            {/* Sample Team Member */}
            <div className="p-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    U
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">You</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-3 h-3" />
                      <span>Administrator</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                    <Shield className="w-3 h-3" />
                    Owner
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Empty State for Additional Members */}
            <div className="p-12 text-center border-t border-dashed border-gray-300 dark:border-gray-700">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No team members yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {onboardingType === 'organization' 
                  ? 'Invite team members to collaborate and manage bookings together'
                  : 'Team management is available for organization accounts. Upgrade to add team members.'
                }
              </p>
              <Button 
                style={{ background: 'var(--brand-primary)' }} 
                className="text-white"
                onClick={() => setShowInviteModal(true)}
                disabled={onboardingType !== 'organization'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Invite Your First Team Member
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
              {onboardingType === 'organization' 
                ? '💡 Team Management Features Coming Soon'
                : 'ℹ️ Individual Provider Account'
              }
            </h4>
            {onboardingType === 'organization' ? (
              <ul className="text-sm text-indigo-800 dark:text-indigo-400 space-y-1">
                <li>• Invite team members via email</li>
                <li>• Assign roles and permissions</li>
                <li>• Track team performance</li>
                <li>• Manage provider schedules</li>
                <li>• Team collaboration tools</li>
              </ul>
            ) : (
              <p className="text-sm text-indigo-800 dark:text-indigo-400">
                You're currently using an individual provider account. Team management features are available for organization accounts. 
                To add team members, consider creating an organization during onboarding or contact support to upgrade your account.
              </p>
            )}
          </Card>
        </motion.div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Invite Team Member
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This feature is coming soon! Team invitations will be available in the next update.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                >
                  <option>Provider</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="outline"
                onClick={() => setShowInviteModal(false)}
              >
                Close
              </Button>
              <Button 
                style={{ background: 'var(--brand-primary)' }}
                className="text-white"
                disabled
              >
                Send Invite (Coming Soon)
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TeamManagement;

