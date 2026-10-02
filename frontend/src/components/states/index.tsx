import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { useTranslation } from '@/lib/i18n';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center', className)}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title ?? t('staff.states.errorTitle')}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description ?? t('staff.states.errorDescription')}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          {t('staff.states.retry')}
        </Button>
      )}
    </div>
  );
}

/** Generic page placeholder: header line, KPI row and two panels. */
export function PageSkeleton({ className, rows = 2 }: { className?: string; rows?: number }) {
  return (
    <div className={cn('space-y-6', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

/** Token-based skeleton block; the shared Skeleton keeps its booking-page palette. */
export function Bone({ className }: { className?: string }) {
  return <Skeleton className={cn('bg-muted before:via-foreground/[0.05] dark:bg-muted dark:before:via-foreground/[0.05]', className)} />;
}
