import { motion } from 'framer-motion';
import { Search, Filter, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { Input } from '@/components/input';

type ViewMode = 'cards' | 'table';
type StatusFilter = 'all' | 'active' | 'inactive';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (value: StatusFilter) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (value: ViewMode) => void;
  showStatusFilter?: boolean;
  showViewToggle?: boolean;
  children?: React.ReactNode;
}

export const FilterBar = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusFilter = 'all',
  onStatusFilterChange,
  viewMode = 'cards',
  onViewModeChange,
  showStatusFilter = true,
  showViewToggle = true,
  children,
}: FilterBarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex flex-wrap items-center gap-3"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
        />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        />
      </div>

      {/* Status Filter */}
      {showStatusFilter && onStatusFilterChange && (
        <div
          className="flex items-center p-1 rounded-xl"
          style={{
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-default)',
          }}
        >
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => (
            <motion.button
              key={status}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStatusFilterChange(status)}
              className="relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize"
              style={{
                color:
                  statusFilter === status
                    ? 'var(--text-primary)'
                    : 'var(--text-subtle)',
              }}
            >
              {statusFilter === status && (
                <motion.div
                  layoutId="statusFilter"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--accent-primary-light)',
                    border: '1px solid var(--accent-primary-light)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{status}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Custom filters */}
      {children}

      {/* View Toggle */}
      {showViewToggle && onViewModeChange && (
        <div
          className="flex items-center p-1 rounded-xl"
          style={{
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-default)',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('cards')}
            className="relative p-2 rounded-lg transition-all"
            style={{
              color:
                viewMode === 'cards'
                  ? 'var(--text-primary)'
                  : 'var(--text-subtle)',
            }}
            title="Card View"
          >
            {viewMode === 'cards' && (
              <motion.div
                layoutId="viewMode"
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
            onClick={() => onViewModeChange('table')}
            className="relative p-2 rounded-lg transition-all"
            style={{
              color:
                viewMode === 'table'
                  ? 'var(--text-primary)'
                  : 'var(--text-subtle)',
            }}
            title="Table View"
          >
            {viewMode === 'table' && (
              <motion.div
                layoutId="viewMode"
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
      )}
    </motion.div>
  );
};

export type { ViewMode, StatusFilter };
