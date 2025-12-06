import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Trash2, Calendar, Clock, User, AlertTriangle, FileText, Tag, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/dialog';
import { Button } from '@/components/button';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { taskAPI } from '@/lib/tasks-assistants/api';
import type { Task } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';
import { formatDateTime, formatDuration, isOverdue } from '@/lib/tasks-assistants/utils';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TaskDetailModal = ({ taskId, isOpen, onClose, onEdit, onDelete }: TaskDetailModalProps) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask();
    } else {
      setTask(null);
    }
  }, [isOpen, taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.get(taskId!);
      if (response.success && response.data) {
        setTask(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load task');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskAPI.delete(taskId!);
      toast.success('Task deleted successfully');
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete task');
    }
  };

  const overdue = task ? isOverdue(task) : false;
  const isUrgent = task?.priority === 'urgent';
  const isCompleted = task?.status === 'completed';

  // Get gradient based on status/priority using CSS variables
  const getHeaderGradient = () => {
    if (overdue) {
      return `linear-gradient(135deg, var(--accent-secondary), var(--accent-secondary-hover))`;
    }
    if (isUrgent) {
      return `linear-gradient(135deg, var(--accent-warning), var(--accent-secondary))`;
    }
    if (isCompleted) {
      return `linear-gradient(135deg, var(--accent-success), var(--accent-success-hover))`;
    }
    return `linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 h-full overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-default)',
        }}
      >
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="h-full overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
                <Spinner />
              </div>
            </div>
          ) : task ? (
            <>
              {/* Premium Gradient Header */}
              <div 
                className="relative h-24 overflow-hidden border-b"
                style={{
                  backgroundColor: '#f4f4f5',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="relative h-full flex items-center px-6">
                  <div className="flex-1">
                    <motion.h2
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {task.title}
                    </motion.h2>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                      {overdue && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: 'var(--accent-secondary-light)',
                            color: 'var(--accent-secondary)',
                            border: '1px solid var(--accent-secondary)',
                          }}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 -mt-2 mb-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onEdit}
                    className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all"
                    style={{
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{
                      background: `linear-gradient(135deg, var(--accent-secondary), var(--accent-secondary-hover))`,
                    }}
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete
                  </motion.button>
                </div>

                {/* Description */}
                {task.description && (
                  <div className="space-y-3 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                      <FileText className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {task.description}
                    </p>
                  </div>
                )}

                {/* Task Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {task.deadline && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border transition-all"
                      style={{
                        backgroundColor: overdue ? 'var(--accent-secondary-light)' : 'var(--bg-secondary)',
                        borderColor: overdue ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: overdue ? 'var(--accent-secondary-light)' : 'var(--accent-primary-light)',
                          }}
                        >
                          <Calendar 
                            className="w-5 h-5" 
                            style={{ 
                              color: overdue ? 'var(--accent-secondary)' : 'var(--accent-primary)' 
                            }} 
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Deadline
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: overdue ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
                            {formatDateTime(task.deadline)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.estimated_duration && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                          }}
                        >
                          <Clock className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Estimated Duration
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {formatDuration(task.estimated_duration)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.actual_duration && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-success-light)',
                          }}
                        >
                          <Clock className="w-5 h-5" style={{ color: 'var(--accent-success)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Actual Duration
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {formatDuration(task.actual_duration)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.client_profile && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                          }}
                        >
                          <User className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Client
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {task.client_profile}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.assignee && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-success-light)',
                          }}
                        >
                          <User className="w-5 h-5" style={{ color: 'var(--accent-success)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Assigned To
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {task.assignee}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.category && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                          }}
                        >
                          <Tag className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Category
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {task.category}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.project && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                          }}
                        >
                          <FileText className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Project
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {task.project}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.related_event && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                          }}
                        >
                          <Tag className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Related Appointment
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {task.related_event}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.is_daily_briefing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--accent-success-light)',
                        borderColor: 'var(--accent-success)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--accent-success)',
                          }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Daily Briefing
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            Enabled
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {task.creation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl backdrop-blur-sm border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                          }}
                        >
                          <Calendar className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                            Created
                          </p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {formatDateTime(task.creation)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Dependencies */}
                {task.dependencies && task.dependencies.length > 0 && (
                  <div className="space-y-3 pb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                      <Tag className="w-4 h-4" />
                      Dependencies
                    </h3>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="grid grid-cols-3 text-xs font-semibold px-4 py-2" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                        <span>Task</span>
                        <span>Type</span>
                        <span>Link</span>
                      </div>
                      {task.dependencies.map((dep) => (
                        <div
                          key={`${dep.depends_on_task}-${dep.dependency_type}`}
                          className="grid grid-cols-3 px-4 py-2 text-sm border-t"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                          <span className="truncate">{dep.depends_on_task}</span>
                          <span className="capitalize">{dep.dependency_type?.replaceAll('_', ' ')}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            — 
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Task not found</p>
              <Button onClick={onClose}>Close</Button>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
