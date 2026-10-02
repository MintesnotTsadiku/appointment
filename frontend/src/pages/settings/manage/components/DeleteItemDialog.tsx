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
import type { DeleteTarget } from '../types';

export function DeleteItemDialog({ target, onCancel, onConfirm }: { target: DeleteTarget | null; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent data-qa="manage-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('staff.manage.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            <span className="font-medium text-foreground">{target?.label}</span> · {t('staff.manage.deleteDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('staff.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction data-qa="manage-delete-confirm" className={buttonVariants({ variant: 'destructive' })} onClick={onConfirm}>
            {t('staff.manage.deleteAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
