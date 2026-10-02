import type { FormEvent, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { useTranslation } from '@/lib/i18n';

interface ItemFormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  busy: boolean;
  submitLabel: string;
  busyLabel: string;
  submitQa: string;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}

/** Dialog frame shared by the create and edit forms. */
export function ItemFormDialog({ open, onClose, title, description, busy, submitLabel, busyLabel, submitQa, onSubmit, children }: ItemFormDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] grid-cols-1 max-w-lg overflow-y-auto p-0">
        <form onSubmit={onSubmit} className="flex flex-col">
          <DialogHeader className="border-b px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">{children}</div>
          <DialogFooter className="gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('staff.form.cancel')}
            </Button>
            <Button type="submit" data-qa={submitQa} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? busyLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
