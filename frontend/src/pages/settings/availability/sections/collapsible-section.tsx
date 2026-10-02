import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Card whose body toggles from its header; used for optional template helpers. */
export function CollapsibleSection({ icon: Icon, title, description, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-card">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="h-auto w-full items-start justify-between gap-3 whitespace-normal rounded-xl px-5 py-4 text-left hover:bg-muted/50"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Icon />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">{title}</span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{description}</span>
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={cn('mt-1.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div id={bodyId} className="border-t p-5">
          {children}
        </div>
      )}
    </section>
  );
}
