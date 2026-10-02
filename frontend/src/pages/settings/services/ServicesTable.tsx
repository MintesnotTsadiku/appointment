import { Link, useNavigate } from 'react-router-dom';
import { Clock, MapPin, MoreHorizontal, Pencil, Trash2, Wallet } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { formatDuration, type Service } from './types';

interface ServicesTableProps {
  services: Service[];
  deleting: boolean;
  onDelete: (service: Service) => void;
}

/** Table on md+, stacked cards below; both share the same row actions. */
export function ServicesTable({ services, deleting, onDelete }: ServicesTableProps) {
  const { t } = useTranslation();
  return (
    <div data-qa="services-list">
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t('staff.services.colName')}</TableHead>
              <TableHead>{t('staff.services.colDuration')}</TableHead>
              <TableHead>{t('staff.services.colPrice')}</TableHead>
              <TableHead>{t('staff.services.colLocations')}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t('staff.services.colActions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.name} data-qa={`services-row-${service.name}`}>
                <TableCell className="max-w-xs">
                  <ServiceName service={service} />
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  <DurationText service={service} />
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  <PriceText price={service.price} />
                </TableCell>
                <TableCell>
                  <LocationsBadge service={service} />
                </TableCell>
                <TableCell className="text-right">
                  <RowActions service={service} deleting={deleting} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {services.map((service) => (
          <li key={service.name} className="rounded-xl border bg-card p-4 shadow-card" data-qa={`services-card-${service.name}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <ServiceName service={service} />
              </div>
              <RowActions service={service} deleting={deleting} onDelete={onDelete} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <DurationText service={service} />
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Wallet className="h-4 w-4" aria-hidden="true" />
                <PriceText price={service.price} />
              </span>
              <LocationsBadge service={service} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceName({ service }: { service: Service }) {
  return (
    <div className="min-w-0">
      <Link
        to={`/settings/services/${service.name}`}
        className="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {service.service_name}
      </Link>
      {service.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>}
    </div>
  );
}

function DurationText({ service }: { service: Service }) {
  const { t } = useTranslation();
  const buffer = service.buffer_before || 0;
  return (
    <>
      {formatDuration(service.duration || 0, t('staff.services.notSet'))}
      {buffer > 0 && (
        <span className="text-xs text-muted-foreground">
          {' '}
          + {buffer} min {t('staff.services.bufferShort')}
        </span>
      )}
    </>
  );
}

function PriceText({ price }: { price: number }) {
  const { t } = useTranslation();
  if (!price || price <= 0) return <span className="text-muted-foreground">{t('staff.services.free')}</span>;
  return <>{price} ETB</>;
}

function LocationsBadge({ service }: { service: Service }) {
  const { t } = useTranslation();
  const count = service.event_types?.length || 0;
  if (count === 0) return <Badge variant="muted">{t('staff.services.noLocations')}</Badge>;
  return (
    <Badge variant="secondary" className="tabular-nums">
      <MapPin aria-hidden="true" />
      {count} {count === 1 ? t('staff.services.location') : t('staff.services.locations')}
    </Badge>
  );
}

function RowActions({ service, deleting, onDelete }: { service: Service; deleting: boolean; onDelete: (service: Service) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    // Non-modal so the delete AlertDialog can take focus right after the menu closes.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`${t('staff.services.colActions')}: ${service.service_name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => service.name && navigate(`/settings/services/${service.name}`)}>
          <Pencil aria-hidden="true" />
          {t('staff.services.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={deleting} className="text-destructive focus:text-destructive" onSelect={() => onDelete(service)}>
          <Trash2 aria-hidden="true" />
          {t('staff.services.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
