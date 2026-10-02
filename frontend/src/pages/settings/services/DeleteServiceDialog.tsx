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
import type { Service } from './types';

interface DeleteServiceDialogProps {
  service: Service | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteServiceDialog({ service, deleting, onCancel, onConfirm }: DeleteServiceDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={!!service} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent data-qa="services-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('staff.services.deleteTitle')} “{service?.service_name}”
          </AlertDialogTitle>
          <AlertDialogDescription>{t('staff.services.deleteDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t('staff.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={deleting}
            data-qa="services-delete-confirm"
            onClick={(event) => {
              // Keep the dialog open until the request settles.
              event.preventDefault();
              onConfirm();
            }}
          >
            {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('staff.services.deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
