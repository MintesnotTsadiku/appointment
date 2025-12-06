import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { Task } from '@/lib/tasks-assistants/types';

interface TasksSidebarProps {
  currentDate: Date;
  tasks: Task[];
  onNavigateToDay: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  dateField: 'deadline' | 'creation' | 'modified';
}

export const TasksSidebar = ({
  currentDate,
  tasks,
  onNavigateToDay,
  onTaskClick,
  dateField,
}: TasksSidebarProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getTaskDate = (task: Task): Date | null => {
    const candidate =
      (dateField === 'deadline' && task.deadline) ||
      (dateField === 'creation' && task.creation) ||
      (dateField === 'modified' && task.modified) ||
      task.deadline ||
      task.creation ||
      task.modified;
    if (!candidate) return null;
    try {
      return parseISO(candidate);
    } catch (e) {
      return null;
    }
  };

  const tasksWithDate = useMemo(() => tasks.filter((task) => !!getTaskDate(task)), [tasks, dateField]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasksWithDate.forEach((t) => {
      const d = getTaskDate(t);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    map.forEach((list) =>
      list.sort((a, b) => {
        const da = getTaskDate(a)?.getTime() || 0;
        const db = getTaskDate(b)?.getTime() || 0;
        return da - db;
      })
    );
    return map;
  }, [tasksWithDate, dateField]);

  return (
    <div className="hidden lg:block w-[300px] flex-shrink-0 space-y-4 sticky top-24 h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
      <div className="rounded-2xl border backdrop-blur-sm p-4 flex-shrink-0" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] mb-2" style={{ color: 'var(--text-subtle)' }}>
          {weekDays.map((d) => (
            <div key={`mini-${d}`} className="py-1">{d[0]}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const count = tasksByDate.get(dayKey)?.length || 0;
            const isTodayDate = isToday(day);
            return (
              <button
                key={`mini-day-${dayKey}`}
                onClick={() => onNavigateToDay(day)}
                className="relative flex items-center justify-center h-9 rounded-lg text-sm font-medium transition-all hover:-translate-y-[1px]"
                style={{
                  backgroundColor: isTodayDate ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                  color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-primary)',
                  border: isTodayDate ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
                }}
                title={count ? `${count} task${count > 1 ? 's' : ''}` : ''}
              >
                {format(day, 'd')}
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      border: '1px solid var(--bg-elevated)'
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border backdrop-blur-sm p-4 flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Tasks this month
        </div>
        {tasksWithDate.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks</div>
        ) : (
          Array.from(tasksByDate.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([dateKey, dateTasks]) => (
              <div key={`list-${dateKey}`} className="mb-3">
                <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-subtle)' }}>
                  {format(parseISO(dateKey), 'EEE, MMM d')}
                </div>
                <div className="space-y-1">
                  {dateTasks.slice(0, 4).map((task) => (
                    <button
                      key={`list-task-${task.name}`}
                      onClick={() => onTaskClick(task)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border transition hover:-translate-y-[1px]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{task.title}</span>
                        {task.deadline && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {format(parseISO(task.deadline), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{task.status}</span>
                        {task.client_profile && <span className="truncate">{task.client_profile}</span>}
                      </div>
                    </button>
                  ))}
                  {dateTasks.length > 4 && (
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      +{dateTasks.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
