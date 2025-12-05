import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Search,
  Filter,
  List,
  LayoutGrid,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  TrendingUp,
  Sparkles,
  MoreVertical,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { Input } from '@/components/input';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/modals/TaskDetailModal';
import { EditTaskModal } from '@/components/tasks/modals/EditTaskModal';
import { CreateTaskModal } from '@/components/tasks/modals/CreateTaskModal';
import { TasksHeader } from './components/TasksHeader';
import { TasksCalendar } from './components/TasksCalendar';
import { TaskFilters } from './components/TaskFilters';
import { taskAPI } from '@/lib/tasks-assistants/api';
import type { Task, TaskStatistics } from '@/lib/tasks-assistants/types';
import type { ViewMode, TimeSlotInterval } from './types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';

type FilterStatus = Task['status'] | 'all';

const TasksDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeSlotInterval, setTimeSlotInterval] = useState<TimeSlotInterval>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showNoDeadline, setShowNoDeadline] = useState(true);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultDate, setCreateModalDefaultDate] = useState<Date | undefined>(undefined);
  const [createModalDefaultTime, setCreateModalDefaultTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadTasks();
    loadStatistics();
  }, [statusFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const response = await taskAPI.list({
        filters,
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
  }, [tasks, searchQuery, statusFilter, showNoDeadline]);

  const getStatusCount = (status: Task['status']) => {
    return statistics?.[status] || 0;
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
      key: 'requested' as const,
      label: 'Requested',
      icon: AlertCircle,
      color: 'from-gray-500 to-gray-600',
      value: getStatusCount('requested'),
    },
    {
      key: 'in_progress' as const,
      label: 'In Progress',
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
      value: getStatusCount('in_progress'),
    },
    {
      key: 'completed' as const,
      label: 'Completed',
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-600',
      value: getStatusCount('completed'),
    },
    {
      key: 'cancelled' as const,
      label: 'Cancelled',
      icon: AlertCircle,
      color: 'from-red-500 to-rose-600',
      value: getStatusCount('cancelled'),
    },
  ];

  return (
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-x-hidden"
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
        {/* Sticky Top Section: Header + Stats + Filters */}
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

          {/* Stats Row - Now part of sticky section */}
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

          {/* Filters - Now part of sticky section */}
          {viewMode === 'cards' && (
            <div 
              className="px-6 py-3 max-w-[1800px] mx-auto"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 98%, transparent)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border-subtle)'
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
                  onStatusFilterChange={setStatusFilter}
                  showNoDeadline={showNoDeadline}
                  onShowNoDeadlineChange={setShowNoDeadline}
                />
              </motion.div>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 max-w-[1800px] mx-auto">
          {/* Main Content */}
          {viewMode === 'cards' ? (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              ) : filteredTasks.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.map((task, index) => (
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
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="min-h-[600px]"
            >
              <TasksCalendar
                tasks={filteredTasks}
                currentDate={currentDate}
                viewMode={viewMode}
                timeSlotInterval={timeSlotInterval}
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
