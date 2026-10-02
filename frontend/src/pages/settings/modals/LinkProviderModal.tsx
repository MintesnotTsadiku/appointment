import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { EmptyState, ListSkeleton } from '@/components/states';

interface LinkProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  serviceName: string;
  organizationId: string | null;
  onSuccess?: () => void;
}

interface Provider {
  name: string;
  provider_name: string;
  email: string;
  phone?: string;
  is_primary_org?: boolean;
}

const CHECKBOX_CLASS = 'mt-0.5 h-4 w-4 shrink-0 border-input accent-primary dark:border-input dark:bg-background';

export const LinkProviderModal = ({ open, onOpenChange, serviceId, serviceName, organizationId, onSuccess }: LinkProviderModalProps) => {
  const { t } = useTranslation();
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isPrimary, setIsPrimary] = useState<Record<string, boolean>>({});

  const { data: providersData, mutate: refreshProviders, isLoading: loadingProviders } = useFrappeGetCall<{
    message: { success: boolean; providers: Provider[]; error?: string };
  }>(
    'appointment.onboarding.get_available_providers_for_service',
    serviceId && organizationId ? { service_id: serviceId, organization_id: organizationId } : undefined,
    `available-providers-${serviceId}-${organizationId}`,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const { call: linkProvider, loading: linking } = useFrappePostCall('appointment.onboarding.link_provider_to_service');

  const providers = providersData?.message?.providers || [];

  // Reset selections whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setSelectedProviders([]);
      setIsPrimary({});
      refreshProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId, organizationId]);

  const toggleSelected = (providerId: string, checked: boolean) => {
    if (checked) {
      setSelectedProviders([...selectedProviders, providerId]);
    } else {
      setSelectedProviders(selectedProviders.filter((p) => p !== providerId));
      setIsPrimary({ ...isPrimary, [providerId]: false });
    }
  };

  // Only one provider may be primary.
  const togglePrimary = (providerId: string, checked: boolean) => {
    if (!checked) {
      setIsPrimary({ ...isPrimary, [providerId]: false });
      return;
    }
    const next: Record<string, boolean> = {};
    Object.keys(isPrimary).forEach((key) => {
      next[key] = false;
    });
    next[providerId] = true;
    setIsPrimary(next);
  };

  const handleLinkProviders = async () => {
    if (!serviceId || selectedProviders.length === 0) return;
    try {
      await Promise.all(
        selectedProviders.map((providerId) =>
          linkProvider({ service_id: serviceId, provider_id: providerId, is_primary: isPrimary[providerId] || false })
        )
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking providers:', error);
    }
  };

  const count = selectedProviders.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-qa="link-provider-modal" className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl flex-col gap-0">
        <DialogHeader className="border-b p-6 pr-14">
          <DialogTitle className="text-base font-semibold">{t('staff.services.linkTitle')}</DialogTitle>
          <DialogDescription className="truncate">{serviceName}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loadingProviders ? (
            <ListSkeleton count={3} />
          ) : providers.length === 0 ? (
            <EmptyState compact icon={Users} title={t('staff.services.linkAllLinked')} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('staff.services.linkHint')}</p>
              <ul className="divide-y rounded-lg border">
                {providers.map((provider) => {
                  const selected = selectedProviders.includes(provider.name);
                  return (
                    <li key={provider.name} className={cn('flex items-start gap-3 p-4 transition-colors', selected && 'bg-accent/40')}>
                      <Checkbox
                        id={`provider-${provider.name}`}
                        className={CHECKBOX_CLASS}
                        checked={selected}
                        onCheckedChange={(checked) => toggleSelected(provider.name, checked)}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`provider-${provider.name}`} className="cursor-pointer font-medium text-foreground">
                          {provider.provider_name}
                          {Boolean(provider.is_primary_org) && <span className="ml-2 text-xs font-normal text-primary">({t('staff.services.primaryInOrg')})</span>}
                        </Label>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{provider.email}</p>
                        {provider.phone && <p className="mt-0.5 text-xs text-muted-foreground">{provider.phone}</p>}
                      </div>
                      {selected && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Checkbox
                            id={`primary-${provider.name}`}
                            className={CHECKBOX_CLASS}
                            checked={isPrimary[provider.name] || false}
                            onCheckedChange={(checked) => togglePrimary(provider.name, checked)}
                          />
                          <Label htmlFor={`primary-${provider.name}`} className="cursor-pointer text-xs text-muted-foreground">
                            {t('staff.services.primary')}
                          </Label>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t p-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('staff.form.cancel')}
          </Button>
          <Button onClick={handleLinkProviders} disabled={count === 0 || linking}>
            {linking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
            {linking ? t('staff.services.linking') : `${t('staff.services.linkAction')}${count > 0 ? ` (${count})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
