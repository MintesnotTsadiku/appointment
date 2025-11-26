import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { Plus, Calendar, Clock, Share2, BarChart3, Users, Settings } from 'lucide-react';
import { CreateServiceModal } from '../modals/CreateServiceModal';
import { ShareLinkModal } from '../modals/ShareLinkModal';

const QuickActions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);

  const actions = [
    {
      id: 'new-service',
      icon: Plus,
      title: 'New Service',
      description: 'Add appointment type',
      color: 'bg-gradient-hero',
      textColor: 'text-white',
      onClick: () => setCreateServiceOpen(true),
    },
    {
      id: 'my-calendar',
      icon: Calendar,
      title: 'My Calendar',
      description: 'View all appointments',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        navigate('/calendar');
      },
    },
    {
      id: 'edit-availability',
      icon: Clock,
      title: 'Edit Availability',
      description: 'Update your hours',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        navigate('/settings/availability');
      },
    },
    {
      id: 'share-link',
      icon: Share2,
      title: 'Share Link',
      description: 'Get your booking URL',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => setShareLinkOpen(true),
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'View Analytics',
      description: 'Deep-dive reports',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        navigate('/analytics');
      },
    },
    {
      id: 'manage-team',
      icon: Users,
      title: 'Manage Team',
      description: 'Add team members',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        navigate('/settings/team');
      },
    },
    {
      id: 'manage',
      icon: Settings,
      title: 'Manage Setup',
      description: 'View & manage all items',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        navigate('/settings/manage');
      },
    },
  ];

  return (
    <>
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className={`${action.color} ${action.textColor} p-6 rounded-xl shadow-md hover:shadow-lg transition-all text-left ${
              action.border ? 'border border-gray-200 dark:border-gray-700' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`flex-shrink-0 p-3 rounded-lg ${
                  action.id === 'new-service'
                    ? 'bg-white/20'
                    : ''
                }`}
                style={
                  action.id !== 'new-service'
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                      }
                    : undefined
                }
              >
                <action.icon
                  className={`w-6 h-6 ${
                    action.id === 'new-service' ? 'text-white' : ''
                  }`}
                  style={
                    action.id !== 'new-service'
                      ? { color: 'var(--brand-primary)' }
                      : undefined
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
                <p
                  className={`text-sm ${
                    action.id === 'new-service'
                      ? 'text-white/80'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {action.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>

      {/* Modals */}
      <CreateServiceModal 
        open={createServiceOpen} 
        onOpenChange={setCreateServiceOpen}
        onSuccess={() => {
          // Optionally refresh data or show success message
          window.location.reload();
        }}
      />
      <ShareLinkModal 
        open={shareLinkOpen} 
        onOpenChange={setShareLinkOpen}
      />
    </>
  );
};

export default QuickActions;

