import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { useTranslation } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import SetupChecklist from '../components/SetupChecklist';
import QuickStats from '../components/QuickStats';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';
import AlertsPanel from '../components/AlertsPanel';
import DebugPanel from '../components/DebugPanel';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);

  // Fetch user data for welcome message
  const { data: userData } = useFrappeGetCall<{ message: { full_name: string } }>(
    'frappe.auth.get_logged_user',
    undefined,
    'user-info'
  );

  const userName = userData?.message?.full_name || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Enhanced Header with Glassmorphism */}
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Welcome back, {userName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
                Here's what's happening with your appointments
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  console.log('Debug panel button clicked');
                  setIsDebugPanelOpen(true);
                }}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg relative group flex items-center gap-2"
                aria-label="Debug Info"
                title="Debug Information Panel - View all setup details"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Debug</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
              </button>
              <button
                className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                aria-label="Help"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                onClick={() => navigate('/settings/profile')}
                className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                aria-label="Profile"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Debug Panel Modal */}
      <DebugPanel isOpen={isDebugPanelOpen} onClose={() => setIsDebugPanelOpen(false)} />
    </div>
  );
};

export default Dashboard;

