import type { FormEvent, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description: ReactNode;
  submitLabel: ReactNode;
  pendingLabel: ReactNode;
  pending: boolean;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
  qa?: string;
  submitQa?: string;
  className?: string;
}

/** Dialog with a scrolling form body and a pinned Cancel / Submit footer. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  submitLabel,
  pendingLabel,
  pending,
  onSubmit,
  children,
  qa,
  submitQa,
  className,
}: FormDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        data-qa={qa}
        className={cn('flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 rounded-xl bg-background shadow-pop backdrop-blur-none', className)}
      >
        <DialogHeader className="space-y-1 border-b px-5 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          <DialogFooter className="gap-2 border-t sm:space-x-0 bg-muted/40 px-5 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('staff.form.cancel')}
            </Button>
            <Button type="submit" data-qa={submitQa} disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
