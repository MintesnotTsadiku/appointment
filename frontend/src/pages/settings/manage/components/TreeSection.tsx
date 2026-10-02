import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface TreeSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  count: number;
  /** Omit for a static, always-open section. */
  expanded?: boolean;
  onToggle?: () => void;
  toggleQa?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** A top-level group in the structure tree with a disclosure toggle and an optional action beside it. */
export function TreeSection({ id, icon: Icon, title, count, expanded = true, onToggle, toggleQa, action, children }: TreeSectionProps) {
  const panelId = `manage-section-${id}`;
  const heading = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 truncate text-base font-semibold text-foreground">{title}</span>
      <Badge variant="muted" className="tabular-nums">{count}</Badge>
    </>
  );

  return (
    <section className="min-w-0 rounded-xl border bg-card shadow-card" aria-labelledby={`${panelId}-label`}>
      <div className={cn('flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4', expanded && 'border-b')}>
        {onToggle ? (
          <Button
            type="button"
            variant="ghost"
            id={`${panelId}-label`}
            data-qa={toggleQa}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="-mx-1 h-auto min-w-0 flex-1 justify-start gap-2 whitespace-normal px-1 py-1.5 text-left hover:bg-accent/60"
          >
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', expanded && 'rotate-90')}
              aria-hidden="true"
            />
            {heading}
          </Button>
        ) : (
          <h2 id={`${panelId}-label`} className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
            {heading}
          </h2>
        )}
        {action}
      </div>
      {expanded && (
        <div id={panelId} className="space-y-2 p-3 sm:p-4">
          {children}
        </div>
      )}
    </section>
  );
}

/** Inline empty/no-match line inside a section. */
export function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Labelled child list under a tree item (linked providers, event types). */
export function SubList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-2 space-y-1.5 border-l-2 pl-2 sm:ml-2 sm:pl-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Disclosure button for a nested tree node. */
export function TreeToggle({ expanded, onToggle, controls, children, qa }: { expanded: boolean; onToggle: () => void; controls: string; children: ReactNode; qa?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      data-qa={qa}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className="h-auto w-full min-w-0 flex-wrap justify-start gap-2 whitespace-normal px-2 py-2 text-left font-normal hover:bg-accent/60"
    >
      <ChevronRight
        className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', expanded && 'rotate-90')}
        aria-hidden="true"
      />
      {children}
    </Button>
  );
}

/** Indented branch under a tree node; indents less on phones. */
export function Branch({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <div id={id} className={cn('ml-2 space-y-2 border-l-2 pl-2 sm:ml-4 sm:pl-4', className)}>
      {children}
    </div>
  );
}
