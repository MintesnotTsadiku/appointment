import { useState } from 'react';
import { toast } from 'sonner';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Unlink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { AvailabilityScope } from '../hooks/use-availability-scope';

/** Removes the selected provider from the selected service after confirmation. */
export function UnlinkProviderButton({ scope }: { scope: AvailabilityScope }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { call: removeProvider, loading } = useFrappePostCall('appointment.onboarding.remove_provider_from_service');

  const unlink = async () => {
    try {
      await removeProvider({ service_id: scope.selectedService, provider_id: scope.selectedProvider });
      toast.success('Provider unlinked successfully');
      scope.refreshServiceProviders();
      scope.setSelectedProvider(null);
    } catch (error) {
      toast.error('Failed to unlink provider', { description: (error as Error)?.message || 'Please try again.' });
    } finally {
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Unlink aria-hidden="true" />
          {t('staff.availability.unlinkProvider')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('staff.availability.unlinkTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('staff.availability.unlinkBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('staff.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              void unlink();
            }}
          >
            {t('staff.availability.unlinkProvider')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
