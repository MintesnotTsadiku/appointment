import { useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { Switch } from '@/components/switch';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { BookingList } from './BookingList';
import { API, type BookingRef, type Resource, type ResourceLocation, type ResourceType } from './types';

interface Draft {
  resource_name: string;
  resource_type: string;
  location: string;
  is_active: boolean;
  notes: string;
}

/** Add or edit one resource. Turning it off or moving it is refused while upcoming bookings hold it. */
export function ResourceDialog({ open, organization, resource, types, locations, defaultLocation, onClose, onSaved }: {
  open: boolean;
  organization: string;
  resource: Resource | null;
  types: ResourceType[];
  locations: ResourceLocation[];
  defaultLocation?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>({ resource_name: '', resource_type: '', location: '', is_active: true, notes: '' });
  const [conflicts, setConflicts] = useState<BookingRef[]>([]);
  const { call, loading } = useFrappePostCall<{ message: { ok: boolean; conflicts?: BookingRef[] } }>(`${API}.save_resource`);
  const activeTypes = types.filter((type) => type.is_active || type.name === resource?.resource_type);

  useEffect(() => {
    if (!open) return;
    setConflicts([]);
    setDraft(resource
      ? { resource_name: resource.resource_name, resource_type: resource.resource_type, location: resource.location, is_active: resource.is_active === 1, notes: resource.notes || '' }
      : { resource_name: '', resource_type: activeTypes[0]?.name || '', location: defaultLocation || locations[0]?.name || '', is_active: true, notes: '' });
    // Reset only when the dialog opens for a resource.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource]);

  async function save() {
    try {
      const result = await call({ organization, name: resource?.name, ...draft, is_active: draft.is_active ? 1 : 0 });
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

  const valid = draft.resource_name.trim() && draft.resource_type && draft.location;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md" data-qa="resource-dialog">
        <DialogHeader>
          <DialogTitle>{resource ? t('staff.resources.editResource') : t('staff.resources.addResource')}</DialogTitle>
          <DialogDescription>{t('staff.resources.resourcesHint')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resource-name">{t('staff.resources.resourceName')}</Label>
            <Input id="resource-name" data-qa="resource-name" value={draft.resource_name} maxLength={80} onChange={(event) => setDraft({ ...draft, resource_name: event.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resource-type">{t('staff.resources.resourceType')}</Label>
              <NativeSelect id="resource-type" data-qa="resource-type" value={draft.resource_type} onChange={(event) => setDraft({ ...draft, resource_type: event.target.value })}>
                {activeTypes.map((type) => <option key={type.name} value={type.name}>{type.type_name}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-location">{t('staff.resources.location')}</Label>
              <NativeSelect id="resource-location" data-qa="resource-location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })}>
                {locations.map((location) => <option key={location.name} value={location.name}>{location.location_name}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resource-notes">{t('staff.resources.notes')}</Label>
            <Input id="resource-notes" value={draft.notes} maxLength={140} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="resource-active">{t('staff.resources.active')}</Label>
            <Switch id="resource-active" data-qa="resource-active" checked={draft.is_active} onCheckedChange={(is_active) => setDraft({ ...draft, is_active })} />
          </div>
          {conflicts.length > 0 && <Conflicts rows={conflicts} />}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('staff.resources.cancel')}</Button>
          <Button type="button" data-qa="resource-save" disabled={!valid || loading} onClick={() => void save()}>{t('staff.resources.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Conflicts({ rows }: { rows: BookingRef[] }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3" data-qa="resource-conflicts">
      <p className="text-sm font-medium">{t('staff.resources.conflictsTitle')}</p>
      <p className="text-xs text-muted-foreground">{t('staff.resources.conflictsHint')}</p>
      <BookingList rows={rows} qa="resource-conflict" />
    </div>
  );
}
