import { motion } from 'framer-motion';
import { Task } from '@/lib/tasks-assistants/types';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface TasksListProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick: (task: Task) => void;
}

export const TasksList = ({ tasks, isLoading, onTaskClick }: TasksListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
      <table className="w-full text-left text-sm">
        <thead style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-subtle)' }}>
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Deadline</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {tasks.map((task, index) => (
            <motion.tr
              key={task.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onTaskClick(task)}
              className="cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                {task.title}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                  task.priority === 'Urgent' ? 'text-red-500 border-red-200 bg-red-50' :
                  task.priority === 'High' ? 'text-orange-500 border-orange-200 bg-orange-50' :
                  task.priority === 'Medium' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                  'text-blue-500 border-blue-200 bg-blue-50'
                }`}>
                  {task.priority}
                </span>
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                {task.deadline ? format(parseISO(task.deadline), 'MMM d, HH:mm') : '-'}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                {task.assignee || '-'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
