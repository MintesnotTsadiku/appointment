import { useEffect, useMemo, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Link } from 'react-router-dom';
import { Palette, ShieldAlert, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { StickySaveBar } from '@/components/settings-layout';
import { StaffShell } from '@/components/staff-shell';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { reloadPlatformBrand } from '@/lib/platform-brand';
import { serverErrorMessage } from '@/lib/utils';
import { BrandPanel } from './BrandPanel';
import { GrowthPanel } from './GrowthPanel';
import { Preview } from './Preview';
import { API, changes, normalise, validate, type Settings } from './types';

const BRAND_FIELDS = new Set(['product_name', 'product_url', 'short_host', 'primary_color', 'support_email', 'telegram_url']);

/** Platform administrators: the platform's own brand and the growth feature switches. */
export default function AdminBrandGrowth() {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Settings }>(`${API}.get_settings`, undefined, 'admin-brand-growth');
  const saved = useMemo(() => (data?.message ? normalise(data.message as never) : null), [data]);

  return (
    <StaffShell eyebrow={t('staff.nav.admin')} title={t('staff.brandGrowth.title')} description={t('staff.brandGrowth.description')} headingQa="brand-growth-heading">
      {isLoading ? (
        <PageSkeleton />
      ) : error ? (
        isPermissionError(error) ? <AccessDenied /> : <ErrorState onRetry={() => void mutate()} />
      ) : saved ? (
        <Editor saved={saved} onSaved={(next) => void mutate({ message: next }, { revalidate: false })} />
      ) : null}
    </StaffShell>
  );
}

function Editor({ saved, onSaved }: { saved: Settings; onSaved: (next: Settings) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Settings>(saved);
  const [tab, setTab] = useState('brand');
  const [showErrors, setShowErrors] = useState(false);
  const { call, loading } = useFrappePostCall<{ message: Settings }>(`${API}.save_settings`);
  useEffect(() => setDraft(saved), [saved]);

  const brandChanges = changes(saved.brand, draft.brand);
  const growthChanges = changes(saved.growth, draft.growth);
  const dirty = Object.keys(brandChanges).length + Object.keys(growthChanges).length > 0;
  const errors = validate(draft);
  const visibleErrors = showErrors ? errors : {};

  async function save() {
    const problems = Object.keys(errors);
    if (problems.length) {
      setShowErrors(true);
      // Open the tab that holds the first problem.
      setTab(problems.some((key) => BRAND_FIELDS.has(key)) ? 'brand' : 'growth');
      toast.error(t('staff.brandGrowth.fixErrors'));
      return;
    }
    try {
      const response = await call({
        brand: Object.keys(brandChanges).length ? JSON.stringify(brandChanges) : undefined,
        growth: Object.keys(growthChanges).length ? JSON.stringify(growthChanges) : undefined,
      });
      const next = normalise(response.message as never);
      setShowErrors(false);
      onSaved(next);
      reloadPlatformBrand();
      toast.success(t('staff.brandGrowth.saved'));
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.brandGrowth.saveFailed'));
    }
  }

  return (
    <div data-qa="brand-growth">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 h-11 w-full sm:w-auto">
          <TabsTrigger value="brand" className="h-9 flex-1 gap-2 sm:flex-none sm:px-5" data-qa="brand-growth-tab-brand">
            <Palette className="size-4" aria-hidden="true" />
            {t('staff.brandGrowth.tabs.brand')}
          </TabsTrigger>
          <TabsTrigger value="growth" className="h-9 flex-1 gap-2 sm:flex-none sm:px-5" data-qa="brand-growth-tab-growth">
            <Sprout className="size-4" aria-hidden="true" />
            {t('staff.brandGrowth.tabs.growth')}
          </TabsTrigger>
        </TabsList>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <TabsContent value="brand" className="mt-0">
              <BrandPanel value={draft.brand} errors={visibleErrors} onChange={(next) => setDraft((current) => ({ ...current, brand: { ...current.brand, ...next } }))} />
            </TabsContent>
            <TabsContent value="growth" className="mt-0">
              <GrowthPanel value={draft.growth} errors={visibleErrors} onChange={(next) => setDraft((current) => ({ ...current, growth: { ...current.growth, ...next } }))} />
            </TabsContent>
          </div>
          <aside className="xl:sticky xl:top-20">
            <Preview draft={draft} />
          </aside>
        </div>
      </Tabs>
      <StickySaveBar dirty={dirty} saving={loading} onSave={() => void save()} onDiscard={() => { setDraft(saved); setShowErrors(false); }}
        disabled={!dirty} saveQa="brand-growth-save" />
    </div>
  );
}

function AccessDenied() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldAlert}
      title={t('staff.admin.deniedTitle')}
      description={t('staff.admin.deniedDescription')}
      action={
        <Button asChild size="sm">
          <Link to="/home">{t('staff.admin.backHome')}</Link>
        </Button>
      }
    />
  );
}

function isPermissionError(error: unknown) {
  const value = error as { httpStatus?: number; exc_type?: string } | null;
  return value?.httpStatus === 403 || value?.exc_type === 'PermissionError';
}
