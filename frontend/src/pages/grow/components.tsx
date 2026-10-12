import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/card';
import { cn } from '@/lib/utils';

/** A Grow page section: icon, title, one-line description and content. */
export function GrowCard({ icon: Icon, title, description, actions, children, className, qa }: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  qa?: string;
}) {
  return (
    <Card data-qa={qa} id={qa} className={cn('min-w-0 scroll-mt-20 overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-6 text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  );
}

/** Kept here too: other Grow sections import it from this module. */
export { copyText } from './copy';
