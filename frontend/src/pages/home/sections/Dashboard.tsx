import { useFrappeGetCall } from 'frappe-react-sdk';
import { useTranslation } from '@/lib/i18n';
import SetupChecklist from '../components/SetupChecklist';
import QuickStats from '../components/QuickStats';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';
import AlertsPanel from '../components/AlertsPanel';

const Dashboard = () => {
  const { t } = useTranslation();

  // Fetch user data for welcome message
  const { data: userData } = useFrappeGetCall<{ message: { full_name: string } }>(
    'frappe.auth.get_logged_user',
    undefined,
    'user-info'
  );

  const userName = userData?.message?.full_name || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('dashboard.welcome') || 'Welcome back'}, {userName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('dashboard.subtitle') || "Here's what's happening with your appointments"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Help"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Profile"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Setup Checklist */}
        <SetupChecklist />

        {/* Quick Stats */}
        <QuickStats />

        {/* Quick Actions */}
        <QuickActions />

        {/* Two Column Layout - Activity & Alerts */}
        <div className="grid lg:grid-cols-2 gap-8">
          <RecentActivity />
          <AlertsPanel />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

