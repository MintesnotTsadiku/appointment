import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const number = new Intl.NumberFormat();

export function Panel({ title, subtitle, aside, children, className, qa }: { title: ReactNode; subtitle?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; qa?: string }) {
  return (
    <section data-qa={qa} className={cn('rounded-xl border bg-card p-5 text-card-foreground shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Kpi({ title, value, detail, Icon, tone }: { title: string; value: string; detail?: ReactNode; Icon: LucideIcon; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {detail && <p className={cn('mt-1 text-xs', tone === 'up' ? 'text-success' : tone === 'down' ? 'text-destructive' : 'text-muted-foreground')}>{detail}</p>}
    </div>
  );
}
