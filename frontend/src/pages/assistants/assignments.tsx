import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link as LinkIcon,
  Plus,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Users,
  UserCircle,
  Calendar,
  ChevronRight,
  LayoutGrid,
  List,
  Zap,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/card';
import { AssistantsHeader } from './components/AssistantsHeader';
import { StatsRow } from './components/StatsRow';
import { FilterBar, StatusFilter } from './components/FilterBar';
import { CreateAssignmentDrawer } from './components/CreateAssignmentDrawer';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type {
  AssistantClientAssignment,
  AssignmentStatistics,
} from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverError, useTaskFormat } from '@/lib/tasks-assistants/format';

type AssignmentViewMode = 'cards' | 'table';
type ModelFilter = 'all' | '1:1' | '1:2' | '1:3';

const AssignmentsPage = () => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const [assignments, setAssignments] = useState<AssistantClientAssignment[]>([]);
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all');
  const [viewMode, setViewMode] = useState<AssignmentViewMode>('cards');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignResponse, statsResponse] = await Promise.all([
        assistantAPI.assignment.list({
          page_length: 100,
          order_by: 'modified desc',
        }),
        assistantAPI.assignment.getStatistics(),
      ]);

      if (assignResponse.success && assignResponse.data) {
        setAssignments(assignResponse.data);
      } else {
        toast.error(t('assistants.assignments.loadFailed'));
      }

      if (statsResponse.success && statsResponse.data) {
        setStatistics(statsResponse.data);
      }
    } catch (error) {
      toast.error(serverError(error, t('assistants.assignments.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      // Status filter
      if (statusFilter !== 'all') {
        const mappedStatus = statusFilter === 'inactive' ? 'inactive' : statusFilter;
        if (assignment.status !== mappedStatus && !(statusFilter === 'active' && assignment.status === 'active')) {
          return false;
        }
      }
      // Model filter
      if (modelFilter !== 'all' && assignment.assignment_model !== modelFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          assignment.va_profile.toLowerCase().includes(query) ||
          assignment.client_profile.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [assignments, statusFilter, modelFilter, searchQuery]);

  const stats = [
    {
      label: t('assistants.assignments.total'),
      value: statistics?.total || 0,
      icon: LinkIcon,
      gradient: 'bg-gradient-primary',
    },
    {
      label: fmt.profileStatus('active'),
      value: statistics?.by_status.active || 0,
      icon: CheckCircle2,
      gradient: 'bg-gradient-success',
    },
    {
      label: fmt.profileStatus('inactive'),
      value: statistics?.by_status.inactive || 0,
      icon: PauseCircle,
      gradient: 'bg-gradient-secondary',
    },
    {
      label: fmt.profileStatus('ended'),
      value: statistics?.by_status.ended || 0,
      icon: XCircle,
      customGradient: 'from-gray-500 to-gray-600',
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-green-500/15', tone: 'text-green-500', dot: 'bg-green-500', icon: CheckCircle2 };
      case 'inactive':
        return { bg: 'bg-orange-500/15', tone: 'text-orange-500', dot: 'bg-orange-500', icon: PauseCircle };
      case 'ended':
        return { bg: 'bg-gray-500/15', tone: 'text-gray-400', dot: 'bg-gray-400', icon: XCircle };
      default:
        return { bg: 'bg-gray-500/15', tone: 'text-gray-400', dot: 'bg-gray-400', icon: XCircle };
    }
  };

  const getModelConfig = (model: string) => {
    switch (model) {
      case '1:1':
        return { gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'bg-gradient-primary' };
      case '1:2':
        return { gradient: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'bg-gradient-secondary' };
      case '1:3':
        return { gradient: 'linear-gradient(135deg, #10b981, #059669)', color: 'bg-gradient-success' };
      default:
        return { gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)', color: 'bg-gray-500' };
    }
  };

  const formatDate = (dateStr?: string) => fmt.date(dateStr) || '-';

  const formatDays = (days: number) =>
    (days === 1 ? t('assistants.assignments.daysOne') : t('assistants.assignments.daysMany')).replace('{0}', fmt.number(days));

  const getDaysActive = (startDate?: string) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div
      className="min-h-screen text-theme-primary overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        <AssistantsHeader
          title={t('assistants.assignments.title')}
          subtitle={t('assistants.assignments.subtitle')}
          icon={LinkIcon}
          showBackButton
          backPath="/assistants"
          actions={
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={loadData}
                aria-label={t('assistants.common.refresh')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">{t('assistants.common.refresh')}</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreateDrawerOpen(true)}
                data-qa="assignment-create"
                aria-label={t('assistants.assignments.newAssignment')}
                className="relative group flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl font-medium text-xs lg:text-sm overflow-hidden"
              >
                <div className="absolute inset-0 transition-all bg-gradient-success group-hover:opacity-90" />
                <Plus className="relative z-10 w-4 h-4 text-white" />
                <span className="relative z-10 text-white hidden sm:inline">
                  {t('assistants.assignments.newAssignment')}
                </span>
                <span className="relative z-10 text-white sm:hidden">{t('assistants.assignments.new')}</span>
                <Sparkles className="relative z-10 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block" />
              </motion.button>
            </div>
          }
        />

        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Row */}
              <StatsRow stats={stats} />

              {/* Model Distribution Cards */}
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { model: '1:1' as const, desc: t('assistants.shared.modelDescOne'), count: statistics.by_model['1:1'] },
                    { model: '1:2' as const, desc: t('assistants.shared.modelDescTwo'), count: statistics.by_model['1:2'] },
                    { model: '1:3' as const, desc: t('assistants.shared.modelDescThree'), count: statistics.by_model['1:3'] },
                  ].map((item) => {
                    const config = getModelConfig(item.model);
                    return (
                      <motion.button
                        key={item.model}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setModelFilter(modelFilter === item.model ? 'all' : item.model)}
                        className={`relative p-5 rounded-2xl text-left transition-all overflow-hidden ${
                          modelFilter === item.model ? 'ring-2 ring-white/30' : ''
                        }`}
                        style={{
                          background: config.gradient,
                        }}
                      >
                        {/* Decorative element */}
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                        <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/5" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white/80 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/20">
                              {item.model}
                            </span>
                            {modelFilter === item.model && (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="text-4xl font-bold text-white mb-1">{fmt.number(item.count)}</div>
                          <div className="text-sm font-semibold text-white">{fmt.model(item.model)}</div>
                          <div className="text-xs text-white/70">{item.desc}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Filter Bar */}
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('assistants.assignments.searchPlaceholder')}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                showViewToggle={false}
              >
                {/* View Mode Toggle */}
                <div
                  className="flex items-center p-1 rounded-xl"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('cards')}
                    className="relative p-2 rounded-lg transition-all"
                    style={{
                      color: viewMode === 'cards' ? 'var(--text-primary)' : 'var(--text-subtle)',
                    }}
                    title={t('assistants.shared.cardView')}
                    aria-label={t('assistants.shared.cardView')}
                  >
                    {viewMode === 'cards' && (
                      <motion.div
                        layoutId="assignViewMode"
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: 'var(--accent-primary-light)',
                          border: '1px solid var(--accent-primary-light)',
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <LayoutGrid className="relative z-10 w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('table')}
                    className="relative p-2 rounded-lg transition-all"
                    style={{
                      color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-subtle)',
                    }}
                    title={t('assistants.shared.tableView')}
                    aria-label={t('assistants.shared.tableView')}
                  >
                    {viewMode === 'table' && (
                      <motion.div
                        layoutId="assignViewMode"
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: 'var(--accent-primary-light)',
                          border: '1px solid var(--accent-primary-light)',
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <List className="relative z-10 w-4 h-4" />
                  </motion.button>
                </div>
              </FilterBar>

              {/* Content */}
              {filteredAssignments.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence>
                      {filteredAssignments.map((assignment, index) => {
                        const modelConfig = getModelConfig(assignment.assignment_model);
                        const daysActive = getDaysActive(assignment.start_date);
                        
                        return (
                          <motion.div
                            key={assignment.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative group"
                            data-qa="assignment-card"
                          >
                            {/* Premium glow effect on hover */}
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
                              style={{ background: modelConfig.gradient.replace('135deg', '145deg').replace(')', ', 0.25)').replace('linear-gradient', 'linear-gradient') }}
                            />
                            
                            <Card
                              className="relative backdrop-blur-xs hover:scale-[1.02] transition-all duration-300 overflow-hidden"
                              style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              {/* Header with gradient based on model */}
                              <div 
                                className="p-4 relative overflow-hidden"
                                style={{ background: modelConfig.gradient }}
                              >
                                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                                
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="text-white font-bold text-sm">{fmt.model(assignment.assignment_model)}</span>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 text-white`}>
                                    <span className={`w-2 h-2 rounded-full ${assignment.status === 'active' ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
                                    {fmt.profileStatus(assignment.status)}
                                  </span>
                                </div>
                              </div>

                              <div className="p-5">
                                {/* VA Info */}
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center ring-2 ring-white/10">
                                    <Users className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                      {t('assistants.assignments.virtualAssistant')}
                                    </p>
                                    <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.va_profile}
                                    </p>
                                  </div>
                                  <Zap className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                                </div>

                                {/* Connection visual */}
                                <div className="flex items-center gap-2 pl-6 mb-4">
                                  <div className="w-0.5 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))' }} />
                                  <LinkIcon className="w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
                                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--border-default), transparent)' }} />
                                </div>

                                {/* Client Info */}
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-secondary flex items-center justify-center ring-2 ring-white/10">
                                    <UserCircle className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                      {t('assistants.assignments.client')}
                                    </p>
                                    <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.client_profile}
                                    </p>
                                  </div>
                                </div>

                                {/* Metrics Row */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  {daysActive !== null && (
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('assistants.assignments.duration')}</span>
                                      </div>
                                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatDays(daysActive)}
                                      </p>
                                    </div>
                                  )}
                                  {assignment.start_date && (
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('assistants.assignments.started')}</span>
                                      </div>
                                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {formatDate(assignment.start_date)}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Footer with end date if exists */}
                                {assignment.end_date && (
                                  <div className="flex items-center gap-2 pt-3 text-xs" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                                    <Clock className="w-3 h-3" />
                                    <span>{t('assistants.assignments.ends').replace('{0}', formatDate(assignment.end_date))}</span>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Table View */
                  <Card
                    className="overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr
                            className="text-left text-xs uppercase tracking-wide"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.vaProfile')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.clientProfile')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.modelShort')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.common.status')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.duration')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.startDate')}</th>
                            <th className="px-4 py-3 font-medium">{t('assistants.assignments.actions')}</th>
                          </tr>
                        </thead>
                        <tbody
                          className="divide-y"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          {filteredAssignments.map((assignment) => {
                            const statusConfig = getStatusConfig(assignment.status);
                            const modelConfig = getModelConfig(assignment.assignment_model);
                            const daysActive = getDaysActive(assignment.start_date);
                            
                            return (
                              <motion.tr
                                key={assignment.name}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-theme-secondary transition-colors"
                                data-qa="assignment-card"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                                      <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.va_profile}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                                      <UserCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.client_profile}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className="text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                                    style={{ background: modelConfig.gradient }}
                                  >
                                    {fmt.model(assignment.assignment_model)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig.bg} ${statusConfig.tone}`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                                    {fmt.profileStatus(assignment.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {daysActive !== null ? (
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {formatDays(daysActive)}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-subtle)' }}>-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {formatDate(assignment.start_date)}
                                </td>
                                <td className="px-4 py-3">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-lg transition-colors"
                                    aria-label={t('assistants.assignments.viewDetails')}
                                    title={t('assistants.assignments.viewDetails')}
                                    style={{
                                      backgroundColor: 'var(--border-subtle)',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </motion.button>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )
              ) : (
                /* Empty State */
                <Card
                  className="p-12 text-center"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-success flex items-center justify-center opacity-50">
                    <LinkIcon className="w-8 h-8 text-white" />
                  </div>
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('assistants.assignments.emptyTitle')}
                  </p>
                  <p
                    className="text-sm mb-6"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {searchQuery || statusFilter !== 'all' || modelFilter !== 'all'
                      ? t('assistants.assignments.emptyFiltered')
                      : t('assistants.assignments.emptyHint')}
                  </p>
                  {!searchQuery && statusFilter === 'all' && modelFilter === 'all' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCreateDrawerOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-success"
                    >
                      <Plus className="w-4 h-4" />
                      {t('assistants.assignments.createTitle')}
                    </motion.button>
                  )}
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Assignment Drawer */}
      <CreateAssignmentDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default AssignmentsPage;

