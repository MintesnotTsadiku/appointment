import { motion } from 'framer-motion';
import { Clock, Calendar, User, ChevronRight, Sparkles, AlertTriangle, Briefcase, Link2 } from 'lucide-react';
import { Card } from '@/components/card';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { formatDate, formatDateTime, formatDuration, isOverdue } from '@/lib/tasks-assistants/utils';
import type { Task } from '@/lib/tasks-assistants/types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showClient?: boolean;
  showAssignee?: boolean;
}

export const TaskCard = ({
  task,
  onClick,
  onEdit,
  onDelete,
  showClient = true,
  showAssignee = true,
}: TaskCardProps) => {
  const overdue = isOverdue(task);
  const isUrgent = task.priority === 'urgent';
  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative group h-full"
    >
      {/* Premium Glow Effect */}
      <div 
        className="absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"
        style={{
          background: overdue
            ? 'linear-gradient(135deg, #ef4444, #f97316)'
            : isUrgent
            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
            : isCompleted
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899)',
        }}
      />
      
      <Card
        className="relative h-full p-6 backdrop-blur-sm transition-all duration-300 cursor-pointer border-2"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: overdue
            ? 'rgba(239, 68, 68, 0.3)'
            : isUrgent
            ? 'rgba(245, 158, 11, 0.3)'
            : isCompleted
            ? 'rgba(16, 185, 129, 0.3)'
            : 'var(--border-default)',
          boxShadow: overdue
            ? '0 8px 32px rgba(239, 68, 68, 0.15)'
            : '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
        onClick={onClick}
      >
        {/* Premium Gradient Accent Bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{
            background: overdue
              ? 'linear-gradient(90deg, #ef4444, #f97316)'
              : isUrgent
              ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
              : isCompleted
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #8b5cf6, #a855f7, #ec4899)',
          }}
        />

        <div className="pt-2">
          {/* Header with Title and Actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                {isUrgent && !isCompleted && (
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500 rounded-full blur-md opacity-50 animate-pulse" />
                      <AlertTriangle className="relative w-5 h-5 text-red-500" />
                    </div>
                  </div>
                )}
                {isCompleted && (
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50" />
                      <Sparkles className="relative w-5 h-5 text-green-500" />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold text-lg mb-1 line-clamp-2 leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {task.title}
                  </h3>
                  {overdue && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold text-white shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      }}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </motion.span>
                  )}
                </div>
              </div>
              
              {task.description && (
                <p
                  className="text-sm mb-4 line-clamp-2 leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {task.description}
                </p>
              )}

              {/* Status and Priority Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>

              {/* Client / Assignee chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {showClient && task.client_profile && (
                  <span
                    className="px-2.5 py-1 text-xs rounded-lg border"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Client: {task.client_profile}
                  </span>
                )}
                {showAssignee && task.assignee && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <User className="w-3 h-3" />
                    {task.assignee}
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: -45 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="flex-shrink-0 p-2.5 rounded-xl transition-all backdrop-blur-sm ml-2"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-muted)',
              }}
              title="View details"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Task Metadata */}
          <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {task.deadline && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2.5 text-sm"
              >
                <div 
                  className={`p-1.5 rounded-lg ${
                    overdue 
                      ? 'bg-red-500/10' 
                      : 'bg-blue-500/10'
                  }`}
                >
                  <Calendar className={`w-4 h-4 ${
                    overdue 
                      ? 'text-red-500' 
                      : 'text-blue-500'
                  }`} />
                </div>
                <span
                  className="font-medium"
                  style={{ 
                    color: overdue 
                      ? 'var(--accent-secondary)' 
                      : 'var(--text-secondary)' 
                  }}
                >
                  {formatDateTime(task.deadline)}
                </span>
              </motion.div>
            )}
            
            {task.estimated_duration && (
              <div className="flex items-center gap-2.5 text-sm">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {formatDuration(task.estimated_duration)} estimated
                </span>
              </div>
            )}
            
            {task.project && (
              <div className="flex items-center gap-2.5 text-sm">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {task.project}
                </span>
              </div>
            )}

            {task.related_event && (
              <div className="flex items-center gap-2.5 text-sm">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Link2 className="w-4 h-4 text-amber-500" />
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {task.related_event}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
