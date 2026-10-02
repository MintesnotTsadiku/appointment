import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/badge';
import { useTranslation } from '@/lib/i18n';
import type { ValidationStatus } from '../types';

const VARIANTS = {
  complete: { variant: 'success', icon: CheckCircle2, key: 'staff.manage.validation.complete' },
  warning: { variant: 'warning', icon: AlertTriangle, key: 'staff.manage.validation.warning' },
  error: { variant: 'destructive', icon: XCircle, key: 'staff.manage.validation.error' },
} as const;

/** Setup-completeness pill; icon plus text so colour is never the only signal. */
export const ValidationBadge = ({ status }: { status?: ValidationStatus }) => {
  const { t } = useTranslation();
  const config = VARIANTS[status ?? 'complete'] ?? VARIANTS.error;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="shrink-0">
      <Icon aria-hidden="true" />
      {t(config.key)}
    </Badge>
  );
};
