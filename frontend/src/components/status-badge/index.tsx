import { Badge, type BadgeProps } from '@/components/badge';
import { useTranslation } from '@/lib/i18n';

const VARIANT: Record<string, BadgeProps['variant']> = {
  Pending: 'info',
  Confirmed: 'success',
  Completed: 'muted',
  Cancelled: 'destructive',
  'No Show': 'warning',
};

const KEY: Record<string, string> = {
  Pending: 'staff.status.pending',
  Confirmed: 'staff.status.confirmed',
  Completed: 'staff.status.completed',
  Cancelled: 'staff.status.cancelled',
  'No Show': 'staff.status.noShow',
};

/** Appointment status pill; color is paired with text so it never carries meaning alone. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status] ?? 'muted'} className={className} data-status={status}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {KEY[status] ? t(KEY[status]) : status}
    </Badge>
  );
}
