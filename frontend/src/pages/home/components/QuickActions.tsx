import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Share2, 
  BarChart3, 
  Users, 
  Settings, 
  FileText,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';
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
      isPrimary: true,
      onClick: () => setCreateServiceOpen(true),
    },
    {
      id: 'my-calendar',
      icon: Calendar,
      title: 'My Calendar',
      description: 'View all appointments',
      onClick: () => navigate('/calendar'),
    },
    {
      id: 'edit-availability',
      icon: Clock,
      title: 'Edit Availability',
      description: 'Update your hours',
      onClick: () => navigate('/settings/availability'),
    },
    {
      id: 'share-link',
      icon: Share2,
      title: 'Share Link',
      description: 'Get your booking URL',
      onClick: () => setShareLinkOpen(true),
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'View Analytics',
      description: 'Deep-dive reports',
      onClick: () => navigate('/analytics'),
    },
    {
      id: 'manage-team',
      icon: Users,
      title: 'Manage Team',
      description: 'Add team members',
      onClick: () => navigate('/settings/team'),
    },
    {
      id: 'manage-policies',
      icon: FileText,
      title: 'Manage Policies',
      description: 'Booking policies & rules',
      onClick: () => navigate('/settings/profile?tab=policies'),
    },
    {
      id: 'manage',
      icon: Settings,
      title: 'Manage Setup',
      description: 'View & manage all items',
      onClick: () => navigate('/settings/manage'),
    },
  ];

  return (
    <>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h2>
          <Zap className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
              className={`relative group text-left rounded-2xl p-5 transition-all duration-300 overflow-hidden ${
                action.isPrimary ? '' : ''
              }`}
              style={action.isPrimary ? {} : { 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              {/* Primary action gradient background */}
              {action.isPrimary && (
                <>
                  <div 
                    className="absolute inset-0 bg-gradient-primary"
                  />
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(to right, var(--accent-primary-hover), var(--accent-primary))'
                    }}
                  />
                  {/* Sparkle effect on hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-4 h-4 text-white/50" />
                  </div>
                </>
              )}

              {/* Non-primary hover effect */}
              {!action.isPrimary && (
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'var(--border-default)' }}
                />
              )}

              <div className="relative z-10 flex items-start gap-4">
                {/* Icon */}
                <div 
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 ${
                    action.isPrimary 
                      ? 'bg-white/20 group-hover:bg-white/30' 
                      : 'group-hover:scale-110'
                  }`}
                  style={!action.isPrimary ? { 
                    backgroundColor: 'var(--accent-primary-light)'
                  } : undefined}
                >
                  <action.icon 
                    className={`w-5 h-5 transition-colors ${
                      action.isPrimary ? 'text-white' : ''
                    }`}
                    style={!action.isPrimary ? { color: 'var(--accent-primary)' } : undefined}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 
                      className={`text-base font-semibold truncate ${
                        action.isPrimary ? 'text-white' : ''
                      }`}
                      style={!action.isPrimary ? { color: 'var(--text-primary)' } : undefined}
                    >
                      {action.title}
                    </h3>
                    <ArrowRight 
                      className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${
                        action.isPrimary ? 'text-white/70' : ''
                      }`}
                      style={!action.isPrimary ? { color: 'var(--text-muted)' } : undefined}
                    />
                  </div>
                  <p 
                    className={`text-sm mt-0.5 truncate ${
                      action.isPrimary ? 'text-white/80' : ''
                    }`}
                    style={!action.isPrimary ? { color: 'var(--text-muted)' } : undefined}
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
