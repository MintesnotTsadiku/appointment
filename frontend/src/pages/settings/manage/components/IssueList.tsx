import { AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

export interface FixAction {
  label: string;
  action: () => void;
}

interface IssueListProps {
  title: string;
  issues: string[];
  fixFor: (issue: string) => FixAction | null;
  compact?: boolean;
}

/** Validation issues with an optional one-click fix per issue. */
export function IssueList({ title, issues, fixFor, compact = false }: IssueListProps) {
  if (!issues.length) return null;
  return (
    <div role="group" aria-label={title} className={cn('min-w-0 rounded-lg border border-warning/40 bg-warning/5', compact ? 'p-2.5' : 'p-3')}>
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {issues.map((issue, idx) => {
          const fix = fixFor(issue);
          return (
            <li key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 break-words">{issue}</span>
              {fix && (
                <Button size="sm" variant="outline" onClick={fix.action} className="h-7 shrink-0 px-2 text-xs">
                  <Wrench aria-hidden="true" />
                  {fix.label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
