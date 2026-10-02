import { Loader2, Trash2, UserPlus, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { SettingsSection } from '@/components/settings-layout';
import { EmptyState } from '@/components/states';
import type { ServiceProvider } from '../types';

interface ServiceProvidersSectionProps {
  providers: ServiceProvider[];
  canLink: boolean;
  removingId: string | null;
  onLink: () => void;
  onRemove: (provider: ServiceProvider) => void;
}

export function ServiceProvidersSection({ providers, canLink, removingId, onLink, onRemove }: ServiceProvidersSectionProps) {
  const { t } = useTranslation();
  const linkButton = canLink && (
    <Button variant="outline" size="sm" onClick={onLink}>
      <UserPlus aria-hidden="true" />
      {t('staff.services.linkProvider')}
    </Button>
  );

  return (
    <SettingsSection
      id="service-providers"
      title={t('staff.services.providersTitle')}
      description={t('staff.services.providersDescription')}
      aside={providers.length > 0 ? linkButton : undefined}
    >
      {providers.length === 0 ? (
        <EmptyState compact icon={Users} title={t('staff.services.noProviders')} action={linkButton || undefined} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {providers.map((provider) => (
            <ProviderRow key={provider.name} provider={provider} removing={removingId === provider.name} disabled={!!removingId} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

interface ProviderRowProps {
  provider: ServiceProvider;
  removing: boolean;
  disabled: boolean;
  onRemove: (provider: ServiceProvider) => void;
}

function ProviderRow({ provider, removing, disabled, onRemove }: ProviderRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{provider.provider_name}</p>
          {Boolean(provider.is_primary) && <Badge variant="info">{t('staff.services.primary')}</Badge>}
          <Badge variant={provider.status === 'Active' ? 'success' : 'muted'}>{provider.status}</Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{provider.email}</p>
        {(provider.price_override || provider.duration_override) && (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {provider.price_override ? `${t('staff.services.priceOverride')}: ${provider.price_override} ETB` : null}
            {provider.price_override && provider.duration_override ? ' · ' : null}
            {provider.duration_override ? `${t('staff.services.durationOverride')}: ${provider.duration_override} min` : null}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onRemove(provider)}
        disabled={disabled}
        aria-label={`${t('staff.services.removeProvider')}: ${provider.provider_name}`}
      >
        {removing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
      </Button>
    </li>
  );
}
