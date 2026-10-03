import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { Conflicts } from './ResourceDialog';
import { API, type BookingRef, type Resource } from './types';

const pad = (value: number) => String(value).padStart(2, '0');
const local = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;

/** Block a resource for a period, given as wall times at its location. */
export function BlockDialog({ resource, onClose, onSaved }: { resource: Resource | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [conflicts, setConflicts] = useState<BookingRef[]>([]);
  const { call, loading } = useFrappePostCall<{ message: { ok: boolean; conflicts?: BookingRef[] } }>(`${API}.save_block`);

  useEffect(() => {
    if (!resource) return;
    const next = new Date(Date.now() + 24 * 3600 * 1000);
    setStart(local(next));
    setEnd(local(new Date(next.getTime() + 2 * 3600 * 1000)));
    setReason('');
    setConflicts([]);
  }, [resource]);

  async function save() {
    if (!resource) return;
    try {
      const result = await call({ resource: resource.name, start, end, reason: reason.trim() || undefined });
      if (!result.message.ok) {
        setConflicts(result.message.conflicts || []);
        return;
      }
      toast.success(t('staff.resources.saved'));
      onSaved();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.resources.saveFailed'));
    }
  }

  return (
    <Dialog open={Boolean(resource)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md" data-qa="resource-block-dialog">
        <DialogHeader>
          <DialogTitle>{t('staff.resources.blockTitle').replace('{0}', resource?.resource_name ?? '')}</DialogTitle>
          <DialogDescription>{t('staff.resources.blockHint')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="block-start">{t('staff.resources.blockStart')}</Label>
              <Input id="block-start" data-qa="block-start" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end">{t('staff.resources.blockEnd')}</Label>
              <Input id="block-end" data-qa="block-end" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">{t('staff.resources.blockReason')}</Label>
            <Input id="block-reason" data-qa="block-reason" value={reason} maxLength={140} onChange={(event) => setReason(event.target.value)} />
          </div>
          {conflicts.length > 0 && <Conflicts rows={conflicts} />}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('staff.resources.cancel')}</Button>
          <Button type="button" data-qa="block-save" disabled={!start || !end || loading} onClick={() => void save()}>{t('staff.resources.blockTime')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
