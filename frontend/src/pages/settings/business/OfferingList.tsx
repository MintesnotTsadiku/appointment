import { Link } from 'react-router-dom';
import { CalendarCheck2, ExternalLink, FileEdit, Globe, Rocket } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState, ListSkeleton } from '@/components/states';

export interface Offering {
  organization: string;
  business_name: string;
  service: string;
  location_name: string | null;
  provider_name: string | null;
  timezone: string | null;
  public_path: string;
  published: boolean;
  offering: string;
}

interface OfferingListProps {
  offerings: Offering[];
  loading: boolean;
  publishing: boolean;
  onTogglePublish: (row: Offering) => void;
}

/** Booking pages grouped by business, each with publish state and links. */
export function OfferingList({ offerings, loading, publishing, onTogglePublish }: OfferingListProps) {
  const { t } = useTranslation();
  if (loading) return <ListSkeleton count={3} />;
  if (!offerings.length) return <EmptyState icon={Globe} title={t('staff.business.noPages')} description={t('staff.business.noPagesHint')} />;
  return (
    <div className="space-y-5">
      {groupByBusiness(offerings).map(([business, rows]) => (
        <div key={business}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{business}</h3>
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <OfferingRow key={row.offering} row={row} publishing={publishing} onTogglePublish={onTogglePublish} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OfferingRow({ row, publishing, onTogglePublish }: { row: Offering; publishing: boolean; onTogglePublish: (row: Offering) => void }) {
  const { t } = useTranslation();
  return (
    <li data-qa="business-offering" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{row.service}</span>
          <Badge variant={row.published ? 'success' : 'muted'} data-qa-state={row.published ? 'published' : 'draft'}>
            {row.published ? <Rocket aria-hidden="true" /> : <FileEdit aria-hidden="true" />}
            {row.published ? t('staff.business.published') : t('staff.business.draft')}
          </Badge>
        </p>
        <p data-qa="business-offering-meta" className="mt-0.5 text-xs text-muted-foreground">
          {[row.location_name, row.provider_name, row.timezone?.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {row.published && (
          <Button asChild variant="ghost" size="sm">
            <Link data-qa="business-public-link" to={row.public_path}>
              <ExternalLink aria-hidden="true" />
              {t('staff.business.openPage')}
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings/team">
            <CalendarCheck2 aria-hidden="true" />
            {t('staff.business.assignStaff')}
          </Link>
        </Button>
        <Button data-qa="business-publish" size="sm" variant={row.published ? 'outline' : 'default'} disabled={publishing} onClick={() => onTogglePublish(row)}>
          {row.published ? t('staff.business.unpublish') : t('staff.business.publish')}
        </Button>
      </div>
    </li>
  );
}

function groupByBusiness(offerings: Offering[]) {
  const groups = new Map<string, Offering[]>();
  for (const row of offerings) groups.set(row.business_name, [...(groups.get(row.business_name) ?? []), row]);
  return [...groups.entries()];
}
