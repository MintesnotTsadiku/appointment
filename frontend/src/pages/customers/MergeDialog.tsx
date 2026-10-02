import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { CustomerPicker } from './CustomerPicker';
import { CUSTOMERS_API, type CustomerSummary } from './types';

interface MergeDialogProps {
  open: boolean;
  organization?: string;
  source: CustomerSummary;
  onClose: () => void;
  onMerged: (targetId: string) => void;
}

/** Managers move one customer's bookings into another and archive the first. */
export function MergeDialog({ open, organization, source, onClose, onMerged }: MergeDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<CustomerSummary | null>(null);
  const { data: preview } = useFrappeGetCall<{ message: { bookings_to_move: number } }>(
    `${CUSTOMERS_API}.merge_preview`,
    { source: source.name, target: target?.name },
    target ? `customer-merge-${source.name}-${target.name}` : null
  );
  const { call, loading } = useFrappePostCall(`${CUSTOMERS_API}.merge`);

  async function confirm() {
    if (!target) return;
    try {
      await call({ source: source.name, target: target.name });
      toast.success(t('staff.customers.merged'));
      onMerged(target.name);
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.customers.saveFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-qa="customer-merge-dialog" className="w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('staff.customers.mergeTitle')}</DialogTitle>
          <DialogDescription>{t('staff.customers.mergeDescription')}</DialogDescription>
        </DialogHeader>
        <CustomerPicker
          organization={organization}
          value={target}
          onChange={setTarget}
          excludeId={source.name}
          label={t('staff.customers.mergeTarget')}
          qa="customer-merge-target"
        />
        {target && preview && (
          <p data-qa="customer-merge-count" className="text-sm text-muted-foreground">
            {t('staff.customers.mergeMoves').replace('{0}', String(preview.message.bookings_to_move))}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('staff.form.cancel')}
          </Button>
          <Button type="button" variant="destructive" data-qa="customer-merge-confirm" disabled={!target || loading} onClick={() => void confirm()}>
            {t('staff.customers.mergeConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
