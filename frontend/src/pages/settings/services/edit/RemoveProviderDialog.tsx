import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { buttonVariants } from '@/components/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/alert-dialog';
import type { ServiceProvider } from '../types';

interface RemoveProviderDialogProps {
  provider: ServiceProvider | null;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveProviderDialog({ provider, removing, onCancel, onConfirm }: RemoveProviderDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={!!provider} onOpenChange={(open) => !open && !removing && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('staff.services.removeProviderTitle')}: {provider?.provider_name}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('staff.services.removeProviderDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>{t('staff.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={removing}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {removing && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('staff.services.removeProvider')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
