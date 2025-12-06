import { motion } from 'framer-motion';
import { getStatusLabel } from '@/lib/tasks-assistants/utils';
import type { Task } from '@/lib/tasks-assistants/types';

interface TaskStatusBadgeProps {
  status: Task['status'];
  className?: string;
}

const statusConfig: Record<Task['status'], { gradient: [string, string]; glow: string }> = {
  'Requested': {
    gradient: ['#6b7280', '#4b5563'],
    glow: 'rgba(107, 114, 128, 0.3)',
  },
  'Assigned': {
    gradient: ['#3b82f6', '#4f46e5'],
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  'In Progress': {
    gradient: ['#eab308', '#f97316'],
    glow: 'rgba(234, 179, 8, 0.3)',
  },
  'Completed': {
    gradient: ['#22c55e', '#059669'],
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  'Cancelled': {
    gradient: ['#ef4444', '#e11d48'],
    glow: 'rgba(239, 68, 68, 0.3)',
  },
};

export const TaskStatusBadge = ({ status, className }: TaskStatusBadgeProps) => {
  const label = getStatusLabel(status);
  const config = statusConfig[status] || statusConfig['Requested'];
  const [color1, color2] = config.gradient;

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md ${
        className || ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        boxShadow: `0 2px 8px ${config.glow}`,
      }}
    >
      {label}
    </motion.span>
  );
};
