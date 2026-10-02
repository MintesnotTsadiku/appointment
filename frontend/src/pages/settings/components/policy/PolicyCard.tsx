import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Switch } from '@/components/switch';
import { formatEtb, type Policy } from './types';

interface PolicyCardProps {
  policy: Policy;
  updating: boolean;
  deleting: boolean;
  onToggleActive: (policy: Policy) => void;
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
}

export function PolicyCard({ policy, updating, deleting, onToggleActive, onEdit, onDelete }: PolicyCardProps) {
  const { t } = useTranslation();
  const active = policy.is_active === 1;
  const switchId = `policy-active-${policy.name}`;

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-foreground">{policy.policy_name}</h4>
            <Badge variant={active ? 'success' : 'muted'}>{active ? t('staff.policies.active') : t('staff.policies.inactive')}</Badge>
            {policy.template_used && <Badge variant="outline">{policy.template_used}</Badge>}
          </div>
          {policy.description && <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            id={switchId}
            checked={active}
            onCheckedChange={() => onToggleActive(policy)}
            disabled={updating}
            aria-label={`${active ? t('staff.policies.deactivate') : t('staff.policies.activate')}: ${policy.policy_name}`}
            className="mr-2"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(policy)} aria-label={`${t('staff.policies.edit')}: ${policy.policy_name}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(policy)}
            disabled={deleting}
            aria-label={`${t('staff.policies.delete')}: ${policy.policy_name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
        <Fact label={t('staff.policies.appliesTo')} value={appliesToLabel(policy, t)} />
        <Fact label={t('staff.policies.deposit')} value={depositLabel(policy, t('staff.policies.none'))} />
        <Fact label={t('staff.policies.cancellation')} value={`${policy.cancellation_window_hours}h`} />
        <Fact label={t('staff.policies.refund')} value={policy.refund_policy} />
      </dl>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function appliesToLabel(policy: Policy, t: (key: string) => string): string {
  if (policy.applies_to === 'All Services') return t('staff.policies.allServices');
  if (policy.applies_to === 'Specific Service' && policy.service) return `${t('staff.policies.service')}: ${policy.service}`;
  if (policy.applies_to === 'Specific Location' && policy.location) return `${t('staff.policies.location')}: ${policy.location}`;
  if (policy.applies_to === 'Specific Provider' && policy.provider) return `${t('staff.policies.provider')}: ${policy.provider}`;
  return policy.applies_to;
}

function depositLabel(policy: Policy, none: string): string {
  if (policy.deposit_percentage > 0) return `${policy.deposit_percentage}%`;
  if (policy.deposit_amount > 0) return formatEtb(policy.deposit_amount);
  return none;
}
