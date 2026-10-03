import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { Switch } from '@/components/switch';
import { FieldHint } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { API, MODE_KEY, type BusinessBalance, type CollectionMode, type CollectionOverride, type FeeType } from './types';

/** The two per-business exceptions: who collects, and an own platform fee. */
export function BusinessRulesDialog({ business, platformMode, feeType, onClose, onSaved }: {
  business: BusinessBalance | null;
  platformMode: CollectionMode;
  feeType: FeeType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [override, setOverride] = useState<CollectionOverride>('Platform default');
  const [ownFee, setOwnFee] = useState(false);
  const [fee, setFee] = useState('0');
  const { call, loading } = useFrappePostCall(`${API}.save_business`);

  useEffect(() => {
    if (!business) return;
    setOverride(business.collection_override);
    setOwnFee(business.override_platform_fee === 1);
    setFee(String(business.platform_fee_override ?? 0));
  }, [business]);

  async function save() {
    if (!business) return;
    try {
      await call({ organization: business.organization, collection_override: override, override_platform_fee: ownFee ? 1 : 0, platform_fee_override: ownFee ? fee || '0' : undefined });
      toast.success(t('staff.adminPayments.saved'));
      onSaved();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.adminPayments.saveFailed'));
    }
  }

  return (
    <Dialog open={Boolean(business)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-qa="admin-business-dialog">
        <DialogHeader>
          <DialogTitle>{t('staff.adminPayments.businessTitle').replace('{0}', business?.organization_name ?? '')}</DialogTitle>
          <DialogDescription>{t('staff.adminPayments.businessHint')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="business-collects">{t('staff.adminPayments.whoCollects')}</Label>
            <NativeSelect id="business-collects" data-qa="admin-business-collects" value={override} onChange={(event) => setOverride(event.target.value as CollectionOverride)}>
              <option value="Platform default">{t('staff.adminPayments.modeDefault').replace('{0}', t(MODE_KEY[platformMode]))}</option>
              <option value="Business collects">{t('staff.adminPayments.modeBusiness')}</option>
              <option value="Platform collects">{t('staff.adminPayments.modePlatform')}</option>
            </NativeSelect>
          </div>
          {feeType !== 'None' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="business-own-fee">{t('staff.adminPayments.ownFee')}</Label>
                <Switch id="business-own-fee" data-qa="admin-business-own-fee" checked={ownFee} onCheckedChange={setOwnFee} />
              </div>
              {ownFee && (
                <div className="space-y-1.5">
                  <Label htmlFor="business-fee">{t('staff.adminPayments.feeValue')} ({feeType === 'Percent' ? '%' : 'ETB'})</Label>
                  <Input id="business-fee" data-qa="admin-business-fee" type="number" min={0} max={feeType === 'Percent' ? 100 : undefined} step="0.01" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} />
                  <FieldHint>{t('staff.adminPayments.ownFeeHint')}</FieldHint>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('staff.adminPayments.cancel')}</Button>
          <Button type="button" data-qa="admin-business-save" disabled={loading} onClick={() => void save()}>
            {t('staff.adminPayments.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
