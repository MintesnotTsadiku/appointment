import { Search, Filter, SortAsc, CalendarClock } from 'lucide-react';
import { Input } from '@/components/input';
import { OptionSelect } from '@/components/select/OptionSelect';
import { useTranslation } from '@/lib/i18n';
import { useTaskFormat } from '@/lib/tasks-assistants/format';

const STATUSES = ['Requested', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

const selectClassName = 'h-auto w-auto gap-2 rounded-lg border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all';

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  showNoDeadline: boolean;
  onShowNoDeadlineChange: (show: boolean) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (assignee: string) => void;
  clientFilter: string;
  onClientFilterChange: (client: string) => void;
  projectFilter: string;
  onProjectFilterChange: (project: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  assigneeOptions: { value: string; label: string }[];
  clientOptions: { value: string; label: string }[];
  projectOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  dateField: 'deadline' | 'creation' | 'modified';
  onDateFieldChange: (field: 'deadline' | 'creation' | 'modified') => void;
}

export const TaskFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showNoDeadline,
  onShowNoDeadlineChange,
  assigneeFilter,
  onAssigneeFilterChange,
  clientFilter,
  onClientFilterChange,
  projectFilter,
  onProjectFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortByChange,
  assigneeOptions,
  clientOptions,
  projectOptions,
  categoryOptions,
  dateField,
  onDateFieldChange,
}: TaskFiltersProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const statuses = [
    { value: 'all', label: t('assistants.common.all') },
    ...STATUSES.map((status) => ({ value: status, label: fmt.taskStatus(status) })),
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap" data-qa="tasks-filters">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <Input
          placeholder={t('tasks.filters.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <SortAsc className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <OptionSelect
          value={sortBy}
          onValueChange={onSortByChange}
          className={selectClassName}
          options={[
            { value: 'deadline_asc', label: t('tasks.filters.sortDeadline') },
            { value: 'priority_desc', label: t('tasks.filters.sortPriority') },
            { value: 'recent', label: t('tasks.filters.sortRecent') },
          ]}
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <OptionSelect value={statusFilter} onValueChange={onStatusFilterChange} className={selectClassName} options={statuses} />
      </div>

      {/* Date field selector */}
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <OptionSelect
          value={dateField}
          onValueChange={(value) => onDateFieldChange(value as 'deadline' | 'creation' | 'modified')}
          className={selectClassName}
          options={[
            { value: 'deadline', label: t('tasks.filters.dateDeadline') },
            { value: 'creation', label: t('tasks.filters.dateCreated') },
            { value: 'modified', label: t('tasks.filters.dateModified') },
          ]}
        />
      </div>

      {/* Assignee Filter */}
      <OptionSelect
        value={assigneeFilter}
        onValueChange={onAssigneeFilterChange}
        className={`${selectClassName} min-w-[140px]`}
        options={[{ value: '', label: t('tasks.filters.allAssistants') }, ...assigneeOptions]}
      />

      {/* Client Filter */}
      <OptionSelect
        value={clientFilter}
        onValueChange={onClientFilterChange}
        className={`${selectClassName} min-w-[160px]`}
        options={[{ value: '', label: t('tasks.filters.allClients') }, ...clientOptions]}
      />

      {/* Project Filter */}
      <OptionSelect
        value={projectFilter}
        onValueChange={onProjectFilterChange}
        className={`${selectClassName} min-w-[150px]`}
        options={[{ value: '', label: t('tasks.filters.allProjects') }, ...projectOptions]}
      />

      {/* Category Filter */}
      <OptionSelect
        value={categoryFilter}
        onValueChange={onCategoryFilterChange}
        className={`${selectClassName} min-w-[140px]`}
        options={[{ value: '', label: t('tasks.filters.allCategories') }, ...categoryOptions]}
      />

      {/* Show No Deadline Toggle */}
      <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all hover:opacity-80" style={{
        backgroundColor: showNoDeadline ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
      }}>
        <input
          type="checkbox"
          checked={showNoDeadline}
          onChange={(e) => onShowNoDeadlineChange(e.target.checked)}
          className="w-4 h-4 rounded"
          style={{
            accentColor: 'var(--accent-primary)',
          }}
        />
        <span style={{ color: 'var(--text-primary)' }}>{t('tasks.filters.showNoDeadline')}</span>
      </label>
    </div>
  );
};


