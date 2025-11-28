import { useState, useEffect } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  PartyPopper,
  Rocket,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl?: string;
}

const SetupChecklist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading } = useFrappeGetCall<{ 
    message: { 
      items: ChecklistItem[]; 
      completed_count: number; 
      total_count: number; 
      progress_percent: number;
      all_complete: boolean;
    } 
  }>(
    'frappe_appointment.onboarding.get_detailed_checklist',
    undefined,
    'checklist-detailed'
  );

  const checklistData = data?.message || {
    items: [],
    completed_count: 0,
    total_count: 7,
    progress_percent: 0,
    all_complete: false
  };

  const checklistItems = checklistData.items;
  const completedCount = checklistData.completed_count;
  const totalCount = checklistData.total_count;
  const progressPercent = checklistData.progress_percent;

  // Celebrate when all complete
  useEffect(() => {
    if (checklistData.all_complete && completedCount === totalCount && totalCount > 0) {
      console.log('🎉 Checklist complete!');
    }
  }, [checklistData.all_complete, completedCount, totalCount]);

  // Show celebration card if all items are complete
  if (completedCount === totalCount && totalCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ 
          background: 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
        }}
      >
        {/* Sparkle decorations */}
        <div className="absolute top-4 right-8 opacity-30">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="absolute bottom-4 left-8 opacity-20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        
        <div className="relative z-10 p-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-5"
          >
            <PartyPopper className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            🎉 All Set Up!
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 mb-5"
          >
            Your scheduling platform is ready to accept bookings
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{totalCount}/{totalCount} tasks completed</span>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="rounded-2xl p-6 animate-pulse"
        style={{ 
          backgroundColor: 'var(--border-subtle)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div 
          className="h-6 rounded w-1/3 mb-4"
          style={{ backgroundColor: 'var(--border-default)' }}
        />
        <div 
          className="h-2 rounded w-full"
          style={{ backgroundColor: 'var(--border-default)' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="relative overflow-hidden rounded-2xl backdrop-blur-sm"
      style={{ 
        backgroundColor: 'var(--border-subtle)',
        border: '2px solid var(--accent-primary-light)'
      }}
    >
      {/* Gradient accent line at top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"
      />

      {/* Header */}
      <div
        className="p-6 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          borderBottom: isExpanded ? '1px solid var(--border-default)' : 'none'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Setup Checklist
              </h3>
              <span 
                className="px-3 py-1 text-sm font-medium rounded-full"
                style={{ 
                  background: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)'
                }}
              >
                {completedCount}/{totalCount} complete
              </span>
            </div>
            
            {/* Progress Bar */}
            <div 
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border-default)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-primary"
              />
            </div>
            
            {/* Progress Text */}
            <p 
              className="text-sm mt-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {progressPercent < 100 
                ? `${100 - progressPercent}% remaining to complete your setup`
                : 'Setup complete!'
              }
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="ml-4 p-2.5 rounded-xl transition-colors"
            style={{ 
              backgroundColor: 'var(--border-default)',
              color: 'var(--text-muted)'
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </motion.button>
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
          >
            <div className="p-6 pt-4 space-y-3">
              {checklistItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                    item.completed ? '' : 'hover:scale-[1.01]'
                  }`}
                  style={{ 
                    backgroundColor: item.completed 
                      ? 'var(--accent-success-light)' 
                      : 'var(--bg-elevated)',
                    border: `1px solid ${item.completed 
                      ? 'var(--accent-success-light)' 
                      : 'var(--border-subtle)'}`
                  }}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    {item.completed ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="p-1 rounded-full bg-gradient-success"
                      >
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </motion.div>
                    ) : (
                      <div 
                        className="p-1 rounded-full"
                        style={{ 
                          backgroundColor: 'var(--border-default)',
                          border: '2px solid var(--border-strong)'
                        }}
                      >
                        <Circle className="w-5 h-5" style={{ color: 'var(--text-subtle)' }} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-semibold ${
                        item.completed ? 'line-through' : ''
                      }`}
                      style={{ 
                        color: item.completed 
                          ? 'var(--accent-success)' 
                          : 'var(--text-primary)'
                      }}
                    >
                      {item.title}
                    </h4>
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  {!item.completed && item.actionUrl && (
                    <motion.button
                      whileHover={{ scale: 1.05, x: 3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.actionUrl?.startsWith('/')) {
                          navigate(item.actionUrl);
                        } else {
                          window.location.href = item.actionUrl!;
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                      style={{ 
                        backgroundColor: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      Setup
                      <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SetupChecklist;
