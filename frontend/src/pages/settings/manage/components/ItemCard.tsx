/**
 * One row in the structure tree (service, location, provider or event type).
 * Action buttons sit beside the content, never inside another control.
 */
import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ValidationBadge } from './ValidationBadge';
import { BookingUrlList } from './BookingUrlList';
import type { ItemType, Row } from '../types';

interface ItemCardProps {
  type: ItemType;
  item: Row;
  onEdit?: () => void;
  onDelete?: () => void;
  nested?: boolean;
  children?: ReactNode;
}

function itemName(type: ItemType, item: Row): string {
  const field = { service: 'service_name', location: 'location_name', provider: 'provider_name', event_type: 'event_type_name' }[type];
  return item[field] ?? '';
}

function useItemDescription(type: ItemType, item: Row): string {
  const { t } = useTranslation();
  if (type === 'service') {
    return item.description || `${item.duration} ${t('staff.manage.minutesShort')} • ${item.price} ${item.currency || 'ETB'}`;
  }
  if (type === 'location') return item.address || t('staff.manage.noAddress');
  if (type === 'provider') return item.email || t('staff.manage.noEmail');
  return item.description || t('staff.manage.noDescription');
}

export const ItemCard = ({ type, item, onEdit, onDelete, nested = false, children }: ItemCardProps) => {
  const { t } = useTranslation();
  const name = itemName(type, item);
  const description = useItemDescription(type, item);
  const issues: string[] = item.validation?.issues ?? [];

  return (
    <div className={cn('min-w-0 rounded-lg border bg-card p-3 sm:p-4', nested && 'bg-muted/40')}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">{name}</h3>
            <ValidationBadge status={item.validation?.status} />
          </div>
          <p className="line-clamp-2 break-words text-sm text-muted-foreground sm:line-clamp-3" title={description}>{description}</p>
          {issues.length > 0 && <p className="break-words text-xs text-warning">{issues.join(', ')}</p>}
          {type === 'provider' && item.booking_urls?.length > 0 && (
            <div className="border-t pt-2">
              <BookingUrlList urls={item.booking_urls} />
            </div>
          )}
          {children}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label={`${t('staff.manage.editAction')} ${name}`}>
                <Pencil aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
                aria-label={`${t('staff.manage.deleteAction')} ${name}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
