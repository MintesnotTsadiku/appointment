import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, BarChart3, Settings, Users } from 'lucide-react';
import SetupChecklist from '../components/SetupChecklist';
import QuickStats from '../components/QuickStats';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';
import AlertsPanel from '../components/AlertsPanel';
import DebugPanel from '../components/DebugPanel';

interface DashboardProps {
  userName: string;
}

const Dashboard = ({ userName }: DashboardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);

  return (
    <div 
      data-qa="app-shell"
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-30"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px] opacity-15"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      {/* Enhanced Header with Glassmorphism */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 
                data-qa="home-heading"
                className="text-3xl sm:text-4xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Welcome back, {userName}!
              </h1>
              <p 
                className="text-sm sm:text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                Here's what's happening with your appointments
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Navigation Links */}
              <motion.button
                onClick={() => navigate('/calendar')}
                className="px-3 py-2 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Calendar"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Calendar</span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/analytics')}
                className="px-3 py-2 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Analytics"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Analytics</span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/reception')}
                className="px-3 py-2 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Reception Console"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Reception</span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/settings')}
                className="px-3 py-2 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Settings</span>
              </motion.button>
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
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

