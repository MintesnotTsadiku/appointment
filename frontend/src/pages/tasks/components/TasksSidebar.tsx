import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, addDays, isToday, parseISO } from 'date-fns';
import { Task } from '@/lib/tasks-assistants/types';
import { useTranslation } from '@/lib/i18n';
import { useTaskFormat } from '@/lib/tasks-assistants/format';
import { personName } from '@/components/assistants/PersonLabel';

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
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => fmt.date(addDays(weekStart, i), { weekday: 'narrow' }));

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

  const taskCount = (count: number) =>
    t(count === 1 ? 'tasks.page.countTasksOne' : 'tasks.page.countTasksMany').replace('{0}', fmt.number(count));

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasksWithDate.forEach((task) => {
      const d = getTaskDate(task);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
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
    <div className="hidden lg:block w-[300px] shrink-0 space-y-4 sticky top-24 h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
      <div className="rounded-2xl border backdrop-blur-xs p-4 shrink-0" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmt.date(currentDate, { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] mb-2" style={{ color: 'var(--text-subtle)' }}>
          {weekDays.map((d, i) => (
            <div key={`mini-${i}`} className="py-1">{d}</div>
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
                className="relative flex items-center justify-center h-9 rounded-lg text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  backgroundColor: isTodayDate ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                  color: isTodayDate ? 'var(--accent-primary)' : 'var(--text-primary)',
                  border: isTodayDate ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
                }}
                title={count ? taskCount(count) : ''}
              >
                {fmt.date(day, { day: 'numeric' })}
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      border: '1px solid var(--bg-elevated)'
                    }}
                  >
                    {fmt.number(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border backdrop-blur-xs p-4 flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {t('tasks.page.sidebarTitle')}
        </div>
        {tasksWithDate.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('tasks.page.noTasks')}</div>
        ) : (
          Array.from(tasksByDate.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([dateKey, dateTasks]) => (
              <div key={`list-${dateKey}`} className="mb-3">
                <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-subtle)' }}>
                  {fmt.date(parseISO(dateKey), { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1">
                  {dateTasks.slice(0, 4).map((task) => (
                    <button
                      key={`list-task-${task.name}`}
                      onClick={() => onTaskClick(task)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border transition hover:-translate-y-px"
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
                            {fmt.time(task.deadline, true)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{fmt.taskStatus(task.status)}</span>
                        {task.client_profile && <span className="truncate">{personName(task.client_name, task.client_profile)}</span>}
                      </div>
                    </button>
                  ))}
                  {dateTasks.length > 4 && (
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {t('tasks.page.moreCount').replace('{0}', fmt.number(dateTasks.length - 4))}
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
