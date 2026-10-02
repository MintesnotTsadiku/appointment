import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Globe, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { Location } from './types';

interface LocationCardProps {
  location: Location;
  deleting: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

export function LocationCard({ location, deleting, onEdit, onDelete }: LocationCardProps) {
  const { t } = useTranslation();
  const name = location.location_name;
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          {location.address && <p className="mt-0.5 break-words text-sm text-muted-foreground">{location.address}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(location)} aria-label={`${t('staff.locations.edit')}: ${name}`}>
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(location)}
            disabled={deleting}
            aria-label={`${t('staff.locations.delete')}: ${name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={location.has_opening_hours ? 'success' : 'warning'}>
          <Clock aria-hidden="true" />
          <span className="tabular-nums">{location.opening_hours_count}</span> {t('staff.locations.hoursSet')}
        </Badge>
        <span className="inline-flex min-w-0 items-center gap-1">
          <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{location.timezone}</span>
        </span>
        {location.phone && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate tabular-nums">{location.phone}</span>
          </span>
        )}
      </div>

      {!location.has_opening_hours && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription className="text-xs">
            {t('staff.locations.noHours')}{' '}
            <Link to="/settings/availability" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('staff.locations.setAvailability')}
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </article>
  );
}
