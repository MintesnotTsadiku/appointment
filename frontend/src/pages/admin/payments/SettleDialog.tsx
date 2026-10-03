import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { API } from './types';

/** Marks due ledger entries as settled: either the chosen entries or all due entries of one business. */
export function SettleDialog({ target, onClose, onDone }: {
  target: { names?: string[]; organization?: string; count: number } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const { call, loading } = useFrappePostCall<{ message: { settled: number } }>(`${API}.settle`);

  async function settle() {
    if (!target) return;
    try {
      const result = await call({ names: target.names ? JSON.stringify(target.names) : undefined, organization: target.organization, note: note.trim() || undefined });
      toast.success(t('staff.adminPayments.settledToast').replace('{0}', String(result.message.settled)));
      setNote('');
      onDone();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.adminPayments.saveFailed'));
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-qa="admin-settle-dialog">
        <DialogHeader>
          <DialogTitle>{t('staff.adminPayments.settleTitle')}</DialogTitle>
          <DialogDescription>{t('staff.adminPayments.settleBody').replace('{0}', String(target?.count ?? 0))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="settle-note">{t('staff.adminPayments.settleNote')}</Label>
          <Input id="settle-note" data-qa="admin-settle-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('staff.adminPayments.cancel')}</Button>
          <Button type="button" data-qa="admin-settle-confirm" disabled={loading} onClick={() => void settle()}>
            {t('staff.adminPayments.settleConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
