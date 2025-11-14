import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { Plus, Calendar, Clock, Share2, BarChart3, Users } from 'lucide-react';

const QuickActions = () => {
  const { t } = useTranslation();

  const actions = [
    {
      id: 'new-service',
      icon: Plus,
      title: t('actions.newService') || 'New Service',
      description: t('actions.newServiceDesc') || 'Add appointment type',
      color: 'bg-gradient-hero',
      textColor: 'text-white',
      onClick: () => {
        // Navigate to create service
        alert('Create new service - to be implemented');
      },
    },
    {
      id: 'my-calendar',
      icon: Calendar,
      title: t('actions.myCalendar') || 'My Calendar',
      description: t('actions.myCalendarDesc') || 'View all appointments',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        // Navigate to calendar
        alert('View calendar - to be implemented');
      },
    },
    {
      id: 'edit-availability',
      icon: Clock,
      title: t('actions.editAvailability') || 'Edit Availability',
      description: t('actions.editAvailabilityDesc') || 'Update your hours',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        // Navigate to availability settings
        alert('Edit availability - to be implemented');
      },
    },
    {
      id: 'share-link',
      icon: Share2,
      title: t('actions.shareLink') || 'Share Link',
      description: t('actions.shareLinkDesc') || 'Get your booking URL',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        // Show share dialog
        alert('Share booking link - to be implemented');
      },
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: t('actions.analytics') || 'View Analytics',
      description: t('actions.analyticsDesc') || 'Deep-dive reports',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        // Navigate to analytics
        alert('View analytics - to be implemented');
      },
    },
    {
      id: 'manage-team',
      icon: Users,
      title: t('actions.manageTeam') || 'Manage Team',
      description: t('actions.manageTeamDesc') || 'Add team members',
      color: 'bg-white dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
      border: true,
      onClick: () => {
        // Navigate to team management
        alert('Manage team - to be implemented');
      },
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('dashboard.quickActions') || 'Quick Actions'}
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
                    : 'bg-gradient-hero bg-opacity-10'
                }`}
              >
                <action.icon
                  className={`w-6 h-6 ${
                    action.id === 'new-service' ? 'text-white' : 'text-brand-primary'
                  }`}
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
  );
};

export default QuickActions;

