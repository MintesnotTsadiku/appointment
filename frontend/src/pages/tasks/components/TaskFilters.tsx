import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/input';

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  showNoDeadline: boolean;
  onShowNoDeadlineChange: (show: boolean) => void;
}

export const TaskFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showNoDeadline,
  onShowNoDeadlineChange,
}: TaskFiltersProps) => {
  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'requested', label: 'Requested' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
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


