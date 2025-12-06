import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { Task } from '@/lib/tasks-assistants/types';

interface TasksKanbanProps {
  tasks: Task[];
  isLoading?: boolean;
  statusUpdating?: string | null;
  onStatusChange: (taskName: string, status: Task['status']) => void;
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onCreateTask: () => void;
}

const columns: { key: Task['status']; title: string; accent: string }[] = [
  { key: 'Requested', title: 'Requested', accent: 'var(--accent-primary)' },
  { key: 'Assigned', title: 'Assigned', accent: 'var(--accent-secondary)' },
  { key: 'In Progress', title: 'In Progress', accent: 'var(--accent-warning)' },
  { key: 'Completed', title: 'Completed', accent: 'var(--accent-success)' },
  { key: 'Cancelled', title: 'Cancelled', accent: 'var(--text-muted)' },
];

export const TasksKanban = ({
  tasks,
  isLoading,
  statusUpdating,
  onStatusChange,
  onTaskClick,
  onTaskEdit,
  onCreateTask,
}: TasksKanbanProps) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<Task['status'] | null>(null);

  const grouped = columns.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.key),
  }));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    setActiveColumn(null);
    setDraggingId(null);
    onStatusChange(taskId, status);
  };

  const renderColumnHeader = (title: string, count: number, accent: string) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
      <span
        className="px-2 py-1 text-[11px] rounded-lg font-semibold"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        {count}
      </span>
    </div>
  );

  return (
    <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Kanban
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Drag tasks across columns to collaborate with your client/VA in real time.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateTask}
          className="relative group flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-primary opacity-90" />
          <div className="absolute inset-0 blur-xl opacity-60 bg-gradient-primary" />
          <Plus className="relative z-10 w-4 h-4 text-white" />
          <span className="relative z-10 text-white">New Task</span>
        </motion.button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading tasks...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {grouped.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setActiveColumn(col.key);
              }}
              onDragLeave={() => setActiveColumn(null)}
              onDrop={(e) => handleDrop(e, col.key)}
              className="rounded-2xl border backdrop-blur-sm p-3 min-h-[320px] flex flex-col gap-3 transition-all"
              style={{
                borderColor: activeColumn === col.key ? col.accent : 'var(--border-subtle)',
                backgroundColor:
                  activeColumn === col.key
                    ? 'color-mix(in srgb, var(--accent-primary-light) 30%, var(--bg-secondary))'
                    : 'var(--bg-elevated)',
              }}
            >
              {renderColumnHeader(col.title, col.tasks.length, col.accent)}

              {col.tasks.length === 0 ? (
                <div
                  className="flex-1 rounded-xl border border-dashed flex items-center justify-center text-sm"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  Drop tasks here
                </div>
              ) : (
                col.tasks.map((task) => (
                  <div
                    key={task.name}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(task.name);
                      e.dataTransfer.setData('taskId', task.name);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab active:cursor-grabbing"
                    style={{
                      opacity: draggingId === task.name ? 0.6 : 1,
                    }}
                  >
                    <TaskCard
                      task={task}
                      showClient
                      showAssignee
                      onClick={() => onTaskClick(task)}
                      onEdit={() => onTaskEdit(task)}
                    />
                    {statusUpdating === task.name && (
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Updating...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


