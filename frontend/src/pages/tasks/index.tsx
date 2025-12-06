import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  FileText,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/modals/TaskDetailModal';
import { EditTaskModal } from '@/components/tasks/modals/EditTaskModal';
import { CreateTaskModal } from '@/components/tasks/modals/CreateTaskModal';
import { TasksSidebar } from './components/TasksSidebar';
import { TasksList } from './components/TasksList';
import { TasksHeader } from './components/TasksHeader';
import { TasksCalendar } from './components/TasksCalendar';
import { TaskFilters } from './components/TaskFilters';
import { TasksKanban } from './components/TasksKanban';
import { taskAPI, assistantAPI, taskMasterDataAPI } from '@/lib/tasks-assistants/api';
import type { Task, TaskStatistics } from '@/lib/tasks-assistants/types';
import type { ViewMode, TimeSlotInterval } from './types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';

type FilterStatus = Task['status'] | 'all';

const TasksDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeSlotInterval, setTimeSlotInterval] = useState<TimeSlotInterval>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('deadline_asc');
  const [dateField, setDateField] = useState<'deadline' | 'creation' | 'modified'>('deadline');
  const [showNoDeadline, setShowNoDeadline] = useState(true);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultDate, setCreateModalDefaultDate] = useState<Date | undefined>(undefined);
  const [createModalDefaultTime, setCreateModalDefaultTime] = useState<string | undefined>(undefined);
  const [assigneeOptions, setAssigneeOptions] = useState<{ value: string; label: string }[]>([]);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, assigneeFilter, clientFilter, projectFilter, categoryFilter]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (assigneeFilter) filters.assignee = assigneeFilter;
      if (clientFilter) filters.client_profile = clientFilter;
      if (projectFilter) filters.project = projectFilter;
      if (categoryFilter) filters.category = categoryFilter;

      const response = await taskAPI.list({
        filters,
        fields:
          'name,title,description,status,priority,deadline,assignee,client_profile,category,project,related_event,estimated_duration,actual_duration,is_daily_briefing,modified,creation',
        page_length: 100,
        order_by: 'deadline asc, priority desc',
      });

      if (response && response.success && response.data) {
        setTasks(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [clientsRes, vasRes, categoriesRes, projectsRes] = await Promise.all([
        assistantAPI.clientProfile.list({ page_length: 200, fields: 'name,full_name' }),
        assistantAPI.vaProfile.list({ page_length: 200, fields: 'name,full_name' }),
        taskMasterDataAPI.categories.list(),
        taskMasterDataAPI.projects.list({}, 'name,description'),
      ]);

      if (vasRes.success && vasRes.data) {
        setAssigneeOptions(
          vasRes.data.map((va: any) => ({ value: va.name, label: va.full_name || va.name }))
        );
      }
      if (clientsRes.success && clientsRes.data) {
        setClientOptions(
          clientsRes.data.map((client: any) => ({ value: client.name, label: client.full_name || client.name }))
        );
      }
      if (categoriesRes.success && categoriesRes.data) {
        setCategoryOptions(
          categoriesRes.data.map((cat: any) => ({ value: cat.name, label: cat.name }))
        );
      }
      if (projectsRes.success && projectsRes.data) {
        setProjectOptions(
          projectsRes.data.map((proj: any) => ({ value: proj.name, label: proj.name }))
        );
      }
    } catch (error) {
      console.error('Failed to load filter options', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await taskAPI.getStatistics();
      if (response && response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (assigneeFilter && task.assignee !== assigneeFilter) return false;
      if (clientFilter && task.client_profile !== clientFilter) return false;
      if (projectFilter && task.project !== projectFilter) return false;
      if (categoryFilter && task.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !task.title.toLowerCase().includes(query) &&
          !task.description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Show/hide tasks without deadline
      if (!showNoDeadline && !task.deadline) {
        return false;
      }
      
      return true;
    });
  }, [tasks, searchQuery, statusFilter, showNoDeadline, assigneeFilter, clientFilter, projectFilter, categoryFilter]);

  const sortedTasks = useMemo(() => {
    const priorityWeight: Record<Task['priority'], number> = {
      Urgent: 3,
      High: 2,
      Medium: 1,
      Low: 0,
    };

    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'priority_desc') {
        return (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
      }
      if (sortBy === 'recent') {
        return new Date(b.modified || b.creation || '').getTime() - new Date(a.modified || a.creation || '').getTime();
      }
      // default deadline asc
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [filteredTasks, sortBy]);

  const getStatusCount = (status: Task['status']) => {
    if (!statistics) return 0;
    // Support both capitalized and legacy lowercase keys
    const direct = statistics[status as keyof TaskStatistics];
    if (typeof direct === 'number') return direct;
    const legacyKey = status.toLowerCase().replace(' ', '_') as keyof TaskStatistics;
    // @ts-ignore legacy access
    return statistics[legacyKey] || 0;
  };

  const statsConfig = [
    {
      key: 'total' as const,
      label: 'Total Tasks',
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
      value: statistics?.total || 0,
    },
    {
      key: 'Requested' as const,
      label: 'Requested',
      icon: AlertCircle,
      color: 'from-gray-500 to-gray-600',
      value: getStatusCount('Requested'),
    },
    {
      key: 'In Progress' as const,
      label: 'In Progress',
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
      value: getStatusCount('In Progress'),
    },
    {
      key: 'Completed' as const,
      label: 'Completed',
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-600',
      value: getStatusCount('Completed'),
    },
    {
      key: 'Cancelled' as const,
      label: 'Cancelled',
      icon: AlertCircle,
      color: 'from-red-500 to-rose-600',
      value: getStatusCount('Cancelled'),
    },
  ];

  const handleStatusChange = async (taskName: string, newStatus: Task['status']) => {
    try {
      setStatusUpdating(taskName);
      await taskAPI.updateStatus(taskName, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.name === taskName ? { ...t, status: newStatus } : t))
      );
      loadStatistics();
      toast.success('Task status updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleTaskRefresh = () => {
    loadTasks();
    loadStatistics();
  };

  const showSidebar = ['week', 'day', 'cards', 'list', 'month'].includes(viewMode);

  return (
    <div
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Premium Ambient Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-40 animate-pulse"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-30"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-25"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Section: Header + Stats + (Filters for cards/kanban/list) */}
        <div 
          className="sticky top-0 z-50"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Header */}
          <TasksHeader
            currentDate={currentDate}
            viewMode={viewMode}
            timeSlotInterval={timeSlotInterval}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
            onTimeSlotIntervalChange={setTimeSlotInterval}
            onCreateTask={() => setIsCreateModalOpen(true)}
          />

          {/* Stats Row */}
          {statistics && (
            <div 
              className="px-6 pt-4 pb-2 max-w-[1800px] mx-auto"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 98%, transparent)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-2 lg:grid-cols-5 gap-3"
              >
                {statsConfig.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl" />
                      <div 
                        className="relative backdrop-blur-sm rounded-xl p-4 hover:bg-[var(--border-subtle)] transition-all duration-300"
                        style={{ 
                          backgroundColor: 'var(--border-subtle)',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                            <div 
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {stat.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Filters for cards/kanban/list only */}
          {(viewMode === 'cards' || viewMode === 'kanban' || viewMode === 'list') && (
            <div 
              className="px-6 py-3 max-w-[1800px] mx-auto border-b"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 98%, transparent)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <TaskFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={(val) => setStatusFilter(val as FilterStatus)}
                  showNoDeadline={showNoDeadline}
                  onShowNoDeadlineChange={setShowNoDeadline}
                  assigneeFilter={assigneeFilter}
                  onAssigneeFilterChange={setAssigneeFilter}
                  clientFilter={clientFilter}
                  onClientFilterChange={setClientFilter}
                  projectFilter={projectFilter}
                  onProjectFilterChange={setProjectFilter}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  assigneeOptions={assigneeOptions}
                  clientOptions={clientOptions}
                  projectOptions={projectOptions}
                  categoryOptions={categoryOptions}
                  dateField={dateField}
                  onDateFieldChange={setDateField}
                />
              </motion.div>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 max-w-[1800px] mx-auto flex gap-6">
          {/* Sidebar */}
          {showSidebar && (
            <TasksSidebar
              currentDate={currentDate}
              tasks={tasks}
              onNavigateToDay={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              onTaskClick={(task) => {
                setSelectedTaskId(task.name);
                setSelectedTask(task);
                setIsDetailModalOpen(true);
              }}
              dateField={dateField}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {viewMode === 'cards' ? (
              <main className="py-8">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse" />
                      <Loader2 className="relative w-12 h-12 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Loading your tasks...
                    </p>
                  </motion.div>
                ) : sortedTasks.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <AnimatePresence mode="popLayout">
                      {sortedTasks.map((task, index) => (
                        <motion.div
                          key={task.name}
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -20 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.03,
                            layout: true,
                          }}
                          layout
                        >
                          <TaskCard
                            task={task}
                            showClient
                            showAssignee
                            onClick={() => {
                              setSelectedTaskId(task.name);
                              setSelectedTask(task);
                              setIsDetailModalOpen(true);
                            }}
                            onEdit={() => {
                              setSelectedTaskId(task.name);
                              setIsEditModalOpen(true);
                            }}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full blur-2xl opacity-20" />
                      <Card
                        className="relative p-12 text-center backdrop-blur-sm max-w-md"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-6 shadow-lg">
                          <FileText className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                          {searchQuery || statusFilter !== 'all' ? 'No tasks match your filters' : 'No tasks yet'}
                        </h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Get started by creating your first task and watch your productivity soar'}
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="relative group px-6 py-3 rounded-xl text-sm font-semibold text-white overflow-hidden shadow-lg"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 group-hover:opacity-90 transition-opacity" />
                            <span className="relative z-10 flex items-center gap-2">
                              <Plus className="w-5 h-5" />
                              Create Your First Task
                            </span>
                          </motion.button>
                        )}
                      </Card>
                    </div>
                  </motion.div>
                )}
              </main>
            ) : viewMode === 'kanban' ? (
              <TasksKanban
                tasks={sortedTasks}
                isLoading={loading}
                statusUpdating={statusUpdating}
                onCreateTask={() => setIsCreateModalOpen(true)}
                onTaskClick={(task) => {
                  setSelectedTaskId(task.name);
                  setSelectedTask(task);
                  setIsDetailModalOpen(true);
                }}
                onTaskEdit={(task) => {
                  setSelectedTaskId(task.name);
                  setIsEditModalOpen(true);
                }}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === 'list' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="py-8"
              >
                <TasksList
                  tasks={sortedTasks}
                  isLoading={loading}
                  onTaskClick={(task) => {
                    setSelectedTaskId(task.name);
                    setSelectedTask(task);
                    setIsDetailModalOpen(true);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="min-h-[600px]"
              >
                <TasksCalendar
                  tasks={sortedTasks}
                  currentDate={currentDate}
                  viewMode={viewMode}
                  timeSlotInterval={timeSlotInterval}
                  dateField={dateField}
                  isLoading={loading}
                  onCreateTask={(date, time) => {
                    setCurrentDate(date);
                    setCreateModalDefaultDate(date);
                    setCreateModalDefaultTime(time);
                    if (viewMode === 'week') {
                      setViewMode('day');
                    }
                    setIsCreateModalOpen(true);
                  }}
                  onTaskClick={(task) => {
                    setSelectedTaskId(task.name);
                    setSelectedTask(task);
                    setIsDetailModalOpen(true);
                  }}
                  onNavigateToDay={(date) => {
                    setCurrentDate(date);
                    setViewMode('day');
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Task Detail Modal */}
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTaskId(null);
          }}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDelete={() => {
            loadTasks();
            loadStatistics();
          }}
        />

        {/* Edit Task Modal */}
        <EditTaskModal
          taskId={selectedTaskId}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTaskId(null);
          }}
          onSave={() => {
            loadTasks();
            loadStatistics();
          }}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setCreateModalDefaultDate(undefined);
            setCreateModalDefaultTime(undefined);
          }}
          onSuccess={() => {
            loadTasks();
            loadStatistics();
            setCreateModalDefaultDate(undefined);
            setCreateModalDefaultTime(undefined);
          }}
        />
      </div>
    </div>
  );
};

export default TasksDashboard;
