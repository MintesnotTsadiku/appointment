/**
 * Consolidated Settings Page
 * Premium Design System - All settings in one place
 * Reference: Reception Console design patterns
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Briefcase,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Building2,
} from 'lucide-react';

interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  gradient: 'primary' | 'secondary' | 'success';
  badge?: string;
}

const Settings = () => {
  const navigate = useNavigate();

  // Settings categories
  const categories: SettingsCategory[] = [
    {
      id: 'business',
      title: 'Business booking setup',
      description: 'Review your services, publish booking pages and share customer links',
      icon: Building2,
      route: '/settings/business',
      gradient: 'primary',
    },
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and account details',
      icon: User,
      route: '/settings/profile',
      gradient: 'primary',
    },
    {
      id: 'team',
      title: 'Team Management',
      description: 'Add and manage team members and providers',
      icon: Users,
      route: '/settings/team',
      gradient: 'secondary',
    },
    {
      id: 'availability',
      title: 'Availability',
      description: 'Set your working hours and availability schedule',
      icon: Clock,
      route: '/settings/availability',
      gradient: 'primary',
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Create and manage your appointment services',
      icon: Briefcase,
      route: '/settings/services',
      gradient: 'secondary',
    },
    {
      id: 'location',
      title: 'Locations',
      description: 'Manage your business locations and addresses',
      icon: MapPin,
      route: '/settings/location',
      gradient: 'success',
    },
    {
      id: 'calendar',
      title: 'Calendar Integration',
      description: 'Connect and manage your calendar accounts',
      icon: CalendarIcon,
      route: '/settings/calendar',
      gradient: 'primary',
    },
    {
      id: 'manage',
      title: 'Manage All',
      description: 'Complete overview of all your settings and configurations',
      icon: SettingsIcon,
      route: '/settings/manage',
      gradient: 'secondary',
    },
  ];

  const handleCategoryClick = (route: string) => {
    navigate(route);
  };

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div 
          className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ background: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Sticky Header - Matching other pages */}
        <header 
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                      <SettingsIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Settings
                    </h1>
                    <p className="text-xs lg:text-sm" style={{ color: 'var(--text-subtle)' }}>
                      Manage your account, services, and preferences
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Settings Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const gradientClass = `bg-gradient-${category.gradient}`;
            
            return (
              <motion.button
                key={category.id}
              data-qa={`settings-${category.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCategoryClick(category.route)}
                className="group relative text-left rounded-2xl backdrop-blur-sm p-6 transition-all duration-300 overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl blur-2xl"
                  style={{
                    background: category.gradient === 'primary' 
                      ? 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : category.gradient === 'secondary'
                      ? 'linear-gradient(to right, var(--gradient-secondary-from), var(--gradient-secondary-to))'
                      : 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))'
                  }}
                />

                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon with Gradient Background */}
                  <div 
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${gradientClass}`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 
                        className="text-lg font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {category.title}
                      </h3>
                      <ChevronRight 
                        className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>
                    <p 
                      className="text-sm line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {category.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

          {/* Quick Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="rounded-2xl backdrop-blur-sm p-6"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Quick Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/home')}
                className="flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: 'var(--text-primary)' }}>Dashboard</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: 'var(--text-primary)' }}>Calendar</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-secondary flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: 'var(--text-primary)' }}>Analytics</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/reception')}
                className="flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: 'var(--text-primary)' }}>Reception Console</span>
              </motion.button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
