import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/card';
import { useTranslation } from '@/lib/i18n';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl?: string;
}

const SetupChecklist = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const { data, isLoading } = useFrappeGetCall<{ message: { completed_steps: number[] } }>(
    'frappe_appointment.onboarding.get_progress',
    undefined,
    'checklist-progress'
  );

  const completedSteps = data?.message?.completed_steps || [];

  const checklistItems: ChecklistItem[] = [
    {
      id: '1',
      title: t('checklist.connectCalendar') || 'Connect calendar',
      description: t('checklist.connectCalendarDesc') || 'Google or built-in calendar',
      completed: completedSteps.includes(1),
      actionUrl: '/settings/calendar',
    },
    {
      id: '2',
      title: t('checklist.setAvailability') || 'Set availability',
      description: t('checklist.setAvailabilityDesc') || 'Define your working hours',
      completed: completedSteps.includes(2),
      actionUrl: '/settings/availability',
    },
    {
      id: '3',
      title: t('checklist.createService') || 'Create appointment type',
      description: t('checklist.createServiceDesc') || 'Add services you offer',
      completed: completedSteps.includes(3),
      actionUrl: '/settings/services',
    },
    {
      id: '4',
      title: t('checklist.shareLink') || 'Share booking link',
      description: t('checklist.shareLinkDesc') || 'Send to your first customer',
      completed: completedSteps.includes(4),
      actionUrl: '/settings/booking-link',
    },
    {
      id: '5',
      title: t('checklist.testBooking') || 'Test booking',
      description: t('checklist.testBookingDesc') || 'Book as guest to test',
      completed: completedSteps.includes(5),
      actionUrl: '/schedule/in/test',
    },
    {
      id: '6',
      title: t('checklist.configureNotifications') || 'Configure notifications',
      description: t('checklist.configureNotificationsDesc') || 'SMS/Email reminders',
      completed: completedSteps.includes(6),
      actionUrl: '/settings/notifications',
    },
    {
      id: '7',
      title: t('checklist.addPayment') || 'Add payment method',
      description: t('checklist.addPaymentDesc') || 'telebirr or Chapa',
      completed: completedSteps.includes(7),
      actionUrl: '/settings/payments',
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Hide checklist if all items are complete
  if (completedCount === totalCount) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-2 border-indigo-200 dark:border-indigo-800">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('checklist.title') || 'Setup Checklist'}
              </h3>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                {completedCount}/{totalCount} {t('common.complete') || 'complete'}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-gradient-hero h-2 rounded-full"
              />
            </div>
          </div>
          <button
            className="ml-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Checklist Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 space-y-4">
              {checklistItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition-all ${
                    item.completed
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    {item.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-medium ${
                        item.completed
                          ? 'text-green-900 dark:text-green-300 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  {!item.completed && item.actionUrl && (
                    <button
                      onClick={() => {
                        // Navigate to action URL
                        window.location.href = item.actionUrl;
                      }}
                      className="flex-shrink-0 px-3 py-1 text-xs font-medium text-brand-primary hover:text-brand-primary-dark dark:text-brand-primary-light transition-colors"
                    >
                      {t('common.setup') || 'Setup →'}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default SetupChecklist;

