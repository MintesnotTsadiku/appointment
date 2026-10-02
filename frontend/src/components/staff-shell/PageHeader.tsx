import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/breadcrumb';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  /** data-qa for the <h1>; existing QA manifests target page headings. */
  headingQa?: string;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, headingQa, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 pb-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0 space-y-0.5">
        {breadcrumbs && breadcrumbs.length > 0 && <PageBreadcrumbs items={breadcrumbs} />}
        {/* Context line, not an eyebrow: sentence case and untracked so Amharic reads correctly. */}
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 data-qa={headingQa} className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PageBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        {items.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            <BreadcrumbItem>
              {crumb.to && index < items.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
