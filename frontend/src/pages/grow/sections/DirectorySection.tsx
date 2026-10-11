import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { ArrowUpRight, Info, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Button, buttonVariants } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Skeleton } from '@/components/skeleton';
import { ErrorState } from '@/components/states';
import { Switch } from '@/components/switch';
import { useAnalyticsScope } from '@/components/analytics/WorkspaceDashboard';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';

interface Choice {
  value: string;
  label: string;
  city?: string;
}

interface Listing {
  enabled: boolean;
  listed: boolean;
  category: string | null;
  area: string | null;
  saved: boolean;
  published: boolean;
  name: string;
  page_path: string | null;
  directory_path: string | null;
  categories: Choice[];
  areas: Choice[];
}

/** Grow page: opt in to the public business directory with a category and an area. */
export default function DirectorySection() {
  const { t, language } = useTranslation();
  const brand = usePlatformBrand();
  const { organization, manager } = useAnalyticsScope();
  const key = organization && manager ? `directory-listing-${organization}-${language}` : null;
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Listing }>(
    'appointment.growth.directory.owner_listing', organization ? { owner_key: organization } : undefined, key, { revalidateOnFocus: false },
  );
  const { call: save, loading: saving } = useFrappePostCall<{ message: Listing }>('appointment.growth.directory.save_owner_listing');
  const listing = data?.message;
  const [form, setForm] = useState({ listed: false, category: '', area: '' });
  useEffect(() => {
    if (listing) setForm({ listed: listing.listed, category: listing.category || '', area: listing.area || '' });
  }, [listing]);
  const tr = (name: string) => t(`staff.grow.directory.${name}`);

  if (!organization || !manager || !brand.growth.directoryEnabled || listing?.enabled === false) return null;

  const dirty = Boolean(listing) && (form.listed !== listing?.listed || form.category !== (listing?.category || '') || form.area !== (listing?.area || ''));
  const incomplete = form.listed && (!form.category || !form.area);
  const submit = async () => {
    try {
      const result = await save({ owner_key: organization, listed: form.listed ? 1 : 0, category: form.category || null, area: form.area || null });
      await mutate(result, { revalidate: false });
      toast.success(form.listed ? tr('listedToast') : tr('hiddenToast'));
    } catch {
      toast.error(tr('saveFailed'));
    }
  };

  return (
    <Card id="directory" data-qa="directory-section">
      <CardHeader className="gap-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPinned className="size-5 text-primary" aria-hidden="true" />
          {tr('title')}
        </CardTitle>
        <CardDescription>{tr('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading && !listing ? (
          <div className="space-y-3"><Skeleton className="h-12 w-full" /><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-11" /><Skeleton className="h-11" /></div></div>
        ) : error || !listing ? (
          <ErrorState title={tr('errorTitle')} description={tr('errorDescription')} onRetry={() => void mutate()} />
        ) : (
          <>
            {!listing.published && (
              <Alert data-qa="directory-unpublished">
                <Info />
                <AlertTitle>{tr('unpublishedTitle')}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{tr('unpublishedDescription')}</p>
                  <Link to="/settings/website" className={buttonVariants({ variant: 'outline', size: 'sm' })}>{tr('publishAction')}</Link>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <label htmlFor="directory-listed" className="text-sm font-medium">{tr('toggle')}</label>
                <p className="text-sm text-muted-foreground">{tr('toggleHint')}</p>
              </div>
              <Switch
                id="directory-listed"
                data-qa="directory-toggle"
                checked={form.listed}
                disabled={!listing.published}
                onCheckedChange={(listed) => setForm((current) => ({ ...current, listed }))}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                {tr('category')}
                <Select value={form.category} onValueChange={(category) => setForm((current) => ({ ...current, category }))}>
                  <SelectTrigger data-qa="directory-category" className="h-11"><SelectValue placeholder={tr('categoryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {listing.categories.map((row) => <SelectItem key={row.value} value={row.value} data-qa={`directory-category-${row.value}`}>{row.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                {tr('area')}
                <Select value={form.area} onValueChange={(area) => setForm((current) => ({ ...current, area }))}>
                  <SelectTrigger data-qa="directory-area" className="h-11"><SelectValue placeholder={tr('areaPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {listing.areas.map((row) => (
                      <SelectItem key={row.value} value={row.value} data-qa={`directory-area-${row.value}`}>
                        {row.label}{row.city && row.city !== row.label ? <span className="text-muted-foreground"> · {row.city}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            {!listing.saved && (form.category || form.area) && <p className="text-xs text-muted-foreground">{tr('suggested')}</p>}
            {incomplete && <p className="text-sm text-destructive" role="alert">{tr('incomplete')}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" className="h-11" onClick={() => void submit()} disabled={!dirty || incomplete || saving} data-qa="directory-save">
                {saving ? tr('saving') : tr('save')}
              </Button>
              {listing.listed && listing.directory_path && (
                <a href={listing.directory_path} target="_blank" rel="noopener" data-qa="directory-view" className={buttonVariants({ variant: 'outline', className: 'h-11' })}>
                  {tr('view')}<ArrowUpRight aria-hidden="true" />
                </a>
              )}
              <span className="text-sm text-muted-foreground" role="status" data-qa="directory-status">
                {listing.listed ? tr('statusListed') : tr('statusHidden')}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
