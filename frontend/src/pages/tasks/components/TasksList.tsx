import { motion } from 'framer-motion';
import { Task } from '@/lib/tasks-assistants/types';
import { useTranslation } from '@/lib/i18n';
import { useTaskFormat } from '@/lib/tasks-assistants/format';
import { Loader2 } from 'lucide-react';
import { PersonLabel } from '@/components/assistants/PersonLabel';

interface TasksListProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick: (task: Task) => void;
}

export const TasksList = ({ tasks, isLoading, onTaskClick }: TasksListProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <p className="mt-4 text-sm text-theme-muted">{t('tasks.page.loading')}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-theme-muted">
        {t('tasks.page.noTasksFound')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden backdrop-blur-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
      <table className="w-full text-left text-sm">
        <thead style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-subtle)' }}>
          <tr>
            <th className="px-4 py-3 font-medium">{t('tasks.page.colTitle')}</th>
            <th className="px-4 py-3 font-medium">{t('assistants.common.status')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.page.colPriority')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.page.colDeadline')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.page.colAssignee')}</th>
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
              className="cursor-pointer transition-colors hover:bg-theme-secondary"
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
                  {fmt.taskStatus(task.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                  task.priority === 'Urgent' ? 'text-red-500 border-red-200 bg-red-50' :
                  task.priority === 'High' ? 'text-orange-500 border-orange-200 bg-orange-50' :
                  task.priority === 'Medium' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                  'text-blue-500 border-blue-200 bg-blue-50'
                }`}>
                  {fmt.taskPriority(task.priority)}
                </span>
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                {task.deadline ? `${fmt.date(task.deadline, { month: 'short', day: 'numeric' })}, ${fmt.time(task.deadline, true)}` : '-'}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                {task.assignee ? <PersonLabel name={task.assignee_name} id={task.assignee} size="xs" /> : '-'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
