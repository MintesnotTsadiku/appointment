import { Search, Filter, SortAsc, CalendarClock } from 'lucide-react';
import { Input } from '@/components/input';

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
  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'Requested', label: 'Requested' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <Input
          placeholder="Search tasks by title or description..."
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
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <option value="deadline_asc">Soonest deadline</option>
          <option value="priority_desc">Highest priority</option>
          <option value="recent">Recently updated</option>
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date field selector */}
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <select
          value={dateField}
          onChange={(e) => onDateFieldChange(e.target.value as 'deadline' | 'creation' | 'modified')}
          className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <option value="deadline">Deadline</option>
          <option value="creation">Created</option>
          <option value="modified">Last updated</option>
        </select>
      </div>

      {/* Assignee Filter */}
      <select
        value={assigneeFilter}
        onChange={(e) => onAssigneeFilterChange(e.target.value)}
        className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 min-w-[140px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <option value="">All VAs</option>
        {assigneeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Client Filter */}
      <select
        value={clientFilter}
        onChange={(e) => onClientFilterChange(e.target.value)}
        className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 min-w-[160px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <option value="">All clients</option>
        {clientOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Project Filter */}
      <select
        value={projectFilter}
        onChange={(e) => onProjectFilterChange(e.target.value)}
        className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 min-w-[150px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <option value="">All projects</option>
        {projectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Category Filter */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 min-w-[140px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <option value="">All categories</option>
        {categoryOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

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
        <span style={{ color: 'var(--text-primary)' }}>Show No Deadline</span>
      </label>
    </div>
  );
};


