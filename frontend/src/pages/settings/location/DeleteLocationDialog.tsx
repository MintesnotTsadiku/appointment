import { Loader2 } from 'lucide-react';
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
import { buttonVariants } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { Location } from './types';

interface DeleteLocationDialogProps {
  location: Location | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteLocationDialog({ location, deleting, onCancel, onConfirm }: DeleteLocationDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={!!location} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('staff.locations.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('staff.locations.deleteConfirm').replace('{name}', location?.location_name ?? '')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t('staff.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={deleting}
            onClick={(event) => {
              // Keep the dialog open until the request settles.
              event.preventDefault();
              onConfirm();
            }}
          >
            {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('staff.locations.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
