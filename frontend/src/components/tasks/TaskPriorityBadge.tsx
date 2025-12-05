import { motion } from 'framer-motion';
import { getPriorityLabel } from '@/lib/tasks-assistants/utils';
import type { Task } from '@/lib/tasks-assistants/types';

interface TaskPriorityBadgeProps {
  priority: Task['priority'];
  className?: string;
}

const priorityConfig: Record<Task['priority'], { gradient: [string, string]; glow: string }> = {
  low: {
    gradient: ['#4ade80', '#10b981'],
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  medium: {
    gradient: ['#facc15', '#f59e0b'],
    glow: 'rgba(234, 179, 8, 0.3)',
  },
  high: {
    gradient: ['#f97316', '#ef4444'],
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  urgent: {
    gradient: ['#dc2626', '#be123c'],
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

export const TaskPriorityBadge = ({ priority, className }: TaskPriorityBadgeProps) => {
  const label = getPriorityLabel(priority);
  const config = priorityConfig[priority];
  const isUrgent = priority === 'urgent';
  const [color1, color2] = config.gradient;

  return (
    <motion.span
      animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={isUrgent ? { duration: 2, repeat: Infinity } : {}}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md ${
        className || ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        boxShadow: isUrgent 
          ? `0 2px 8px ${config.glow}, 0 0 12px rgba(239, 68, 68, 0.5)`
          : `0 2px 8px ${config.glow}`,
      }}
    >
      {label}
    </motion.span>
  );
};
