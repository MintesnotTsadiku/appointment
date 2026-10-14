import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Check, Handshake, Mail, Phone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Label } from '@/components/label';
import { EmptyState } from '@/components/states';
import { Textarea } from '@/components/textarea';
import { useRewardText } from '@/components/growth-referrals/useRewardText';
import { useTranslation } from '@/lib/i18n';
import { formatPhone, phoneHref } from '@/lib/phone';
import { PARTNERS_API } from '@/lib/referral-link';
import { serverErrorMessage } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { PARTNER_STATUS_VARIANT, type Partner } from './types';

/** Partner applications: approve (issues a code) or reject with a note. */
export function PartnersPanel({ rows, onChanged }: { rows: Partner[]; onChanged: () => void }) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState<Partner | null>(null);
  const { call, loading } = useFrappePostCall<{ message: Partner }>(`${PARTNERS_API}.review`);

  async function review(partner: Partner, status: 'Approved' | 'Rejected', note?: string) {
    try {
      const response = await call({ partner: partner.name, status, note });
      toast.success(status === 'Approved' ? fill(t('staff.referralsAdmin.approved'), response.message.referral_code ?? '') : t('staff.referralsAdmin.rejected'));
      setRejecting(null);
      onChanged();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.referralsAdmin.reviewFailed'));
    }
  }

  if (!rows.length) return <EmptyState icon={Handshake} title={t('staff.referralsAdmin.emptyPartners')} description={t('staff.referralsAdmin.emptyPartnersBody')} />;
  return (
    <>
      <ul data-qa="admin-partners-list" className="space-y-3">
        {rows.map((row) => (
          <PartnerRow key={row.name} row={row} busy={loading} onApprove={() => void review(row, 'Approved')} onReject={() => setRejecting(row)} />
        ))}
      </ul>
      <RejectDialog partner={rejecting} busy={loading} onClose={() => setRejecting(null)} onReject={(note) => rejecting && void review(rejecting, 'Rejected', note)} />
    </>
  );
}

function PartnerRow({ row, busy, onApprove, onReject }: { row: Partner; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const { t } = useTranslation();
  const { date } = useRewardText();
  return (
    <li data-qa="admin-partner-row" data-qa-state={row.status} className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{row.partner_name}</p>
          <p className="text-sm text-muted-foreground">
            {[row.organization_name, t(`staff.referralsAdmin.kind.${row.kind}`)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Badge variant={PARTNER_STATUS_VARIANT[row.status]}>{t(`staff.referralsAdmin.partner${row.status}`)}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <a href={`mailto:${row.email}`} className="inline-flex min-h-6 items-center gap-1.5 break-all hover:text-foreground"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{row.email}</a>
        {row.phone && <a href={phoneHref(row.phone) || undefined} className="inline-flex min-h-6 items-center gap-1.5 hover:text-foreground"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{formatPhone(row.phone)}</a>}
        {row.applied_on && <span>{fill(t('staff.referralsAdmin.appliedOn'), date(row.applied_on))}</span>}
      </div>
      {row.message && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">{row.message}</p>}
      {row.status === 'Approved' && (
        <p className="mt-2 text-sm text-foreground">
          {t('staff.referralsAdmin.partnerCode')} <span data-qa="admin-partner-code" className="font-mono font-semibold">{row.referral_code}</span>
          {' · '}{fill(t('staff.referralsAdmin.qualified'), row.qualified_businesses)}
        </p>
      )}
      {row.status === 'Pending' && (
        <div className="mt-3 grid gap-2 sm:flex">
          <Button data-qa="admin-partner-approve" className="min-h-11 sm:min-h-9" disabled={busy} onClick={onApprove}>
            <Check aria-hidden="true" />
            {t('staff.referralsAdmin.approve')}
          </Button>
          <Button data-qa="admin-partner-reject" variant="outline" className="min-h-11 sm:min-h-9" disabled={busy} onClick={onReject}>
            <X aria-hidden="true" />
            {t('staff.referralsAdmin.reject')}
          </Button>
        </div>
      )}
    </li>
  );
}

function RejectDialog({ partner, busy, onClose, onReject }: { partner: Partner | null; busy: boolean; onClose: () => void; onReject: (note: string) => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  return (
    <Dialog open={Boolean(partner)} onOpenChange={(open) => { if (!open) { setNote(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fill(t('staff.referralsAdmin.rejectTitle'), partner?.partner_name ?? '')}</DialogTitle>
          <DialogDescription>{t('staff.referralsAdmin.rejectBody')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="partner-reject-note">{t('staff.referralsAdmin.rejectNote')}</Label>
          <Textarea id="partner-reject-note" data-qa="admin-partner-reject-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-qa="admin-partner-reject-cancel">{t('staff.referralsAdmin.cancel')}</Button>
          <Button data-qa="admin-partner-reject-confirm" variant="destructive" disabled={busy} onClick={() => onReject(note)}>{t('staff.referralsAdmin.reject')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
