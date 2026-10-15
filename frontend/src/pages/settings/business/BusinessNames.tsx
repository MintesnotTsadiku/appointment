import { useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { LocalizedInput } from '@/pages/settings/website-editor/fields';

type Names = { en?: string; am?: string };

export interface BusinessNamesRow {
  organization: string;
  name: Names;
  description: Names;
  providers: { id: string; name: Names }[];
}

/** The names customers see on booking pages, in English and Amharic side by side (like the bio). */
export function BusinessNames() {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: BusinessNamesRow[] }>('appointment.scheduler.public_names.business_names');
  const rows = data?.message ?? [];
  if (!rows.length) return null;
  return (
    <SettingsSection title={t('staff.business.namesTitle')} description={t('staff.business.namesDescription')}>
      <div className="space-y-8">
        {rows.map((row) => <BusinessNamesCard key={row.organization} row={row} onSaved={() => void mutate()} />)}
      </div>
    </SettingsSection>
  );
}

export function BusinessNamesCard({ row, onSaved }: { row: BusinessNamesRow; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(row);
  const { call: save, loading } = useFrappePostCall('appointment.scheduler.public_names.save_business_names');
  useEffect(() => setForm(row), [row]);
  const dirty = JSON.stringify(form) !== JSON.stringify(row);

  async function submit() {
    try {
      await save({
        organization: row.organization,
        organization_name: form.name.en ?? '', organization_name_am: form.name.am ?? '',
        description: form.description.en ?? '', description_am: form.description.am ?? '',
        providers: JSON.stringify(form.providers.map((item) => ({ id: item.id, name: item.name.en ?? '', name_am: item.name.am ?? '' }))),
      });
      toast.success(t('staff.business.namesSaved'));
      onSaved();
    } catch (error) {
      toast.error(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  return (
    <form data-qa="business-names" data-organization={row.organization} className="@container min-w-0 space-y-4"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <LocalizedInput label={t('staff.business.namesBusiness')} value={form.name} required maxLength={140} qa="business-name"
        onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
      <LocalizedInput label={t('staff.business.namesDescriptionLabel')} value={form.description} long maxLength={1000} qa="business-description"
        onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
      {form.providers.map((provider, index) => (
        <LocalizedInput key={provider.id} label={`${t('staff.business.namesProvider')} · ${row.providers[index]?.name.en || provider.id}`} value={provider.name} required maxLength={140} qa={`provider-name-${index}`}
          onChange={(value) => setForm((prev) => ({ ...prev, providers: prev.providers.map((item) => item.id === provider.id ? { ...item, name: value } : item) }))} />
      ))}
      <FieldHint>{t('staff.business.namesHint')}</FieldHint>
      <div className="flex gap-2">
        <Button type="submit" disabled={!dirty || loading} data-qa="business-names-save">{loading ? t('staff.business.namesSaving') : t('staff.business.namesSave')}</Button>
        {dirty && <Button type="button" variant="ghost" onClick={() => setForm(row)}>{t('staff.business.namesDiscard')}</Button>}
      </div>
    </form>
  );
}
