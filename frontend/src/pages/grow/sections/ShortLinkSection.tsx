import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { AtSign, Check, CircleAlert, Globe, History, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { usePlatformBrand } from '@/lib/platform-brand';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { fill } from '@/pages/manage-booking/format';
import { useDebounced } from '@/pages/customers/useDebounced';
import { GrowCard } from '../components';
import { localSlugProblem, normalizeSlug } from '../share-core';
import { SLUG_CHANGE_API, SLUG_CHECK_API, type GrowContext, type SlugCheck } from '../types';

interface ChangeResult { slug: string; short: string; aliases: string[] }

/** The short public address, with live availability, suggestions and a safe change. */
export default function ShortLinkSection({ data, onChanged }: { data: GrowContext; onChanged: () => void }) {
  const { t } = useTranslation();
  const { shortHost } = usePlatformBrand();
  const host = data.link.short ? data.link.short.split('/')[0] : shortHost;
  const current = data.link.slug || '';
  const [text, setText] = useState(current);
  const [confirming, setConfirming] = useState(false);
  const [aliases, setAliases] = useState<string[] | null>(null);
  const candidate = normalizeSlug(text);
  const query = useDebounced(candidate, 350);
  const local = candidate ? localSlugProblem(candidate, data.slug.rules) : 'length';
  const { data: checkData, isLoading } = useFrappeGetCall<{ message: SlugCheck }>(
    SLUG_CHECK_API,
    { business: data.business.key, slug: query },
    data.slug.editable ? `grow-slug-${data.business.key}-${query}` : null
  );
  const check = checkData?.message;
  const fresh = check && check.slug === candidate && query === candidate;
  const changeCall = useFrappePostCall<{ message: ChangeResult }>(SLUG_CHANGE_API);
  // An independent provider without a website edits its provider page address (`/schedule/p/<slug>`).
  const page = data.slug.kind === 'provider_page';

  if (!data.slug.editable) {
    return (
      <GrowCard qa="grow-short-link" icon={AtSign} title={t('staff.grow.slug.title')} description={t('staff.grow.slug.noSite')}>
        <Button asChild size="lg" variant="outline" data-qa="grow-slug-create-site">
          <Link to="/settings/website">
            <Globe aria-hidden="true" />
            {t('staff.grow.slug.createSite')}
          </Link>
        </Button>
      </GrowCard>
    );
  }

  const status = (() => {
    if (candidate === current) return { tone: 'muted', text: t('staff.grow.slug.isCurrent') };
    if (local === 'length') return { tone: 'error', text: fill(t('staff.grow.slug.length'), data.slug.rules.min, data.slug.rules.max) };
    if (local === 'format') return { tone: 'error', text: t('staff.grow.slug.format') };
    if (!fresh || isLoading) return { tone: 'muted', text: t('staff.grow.slug.checking') };
    if (check.available) return { tone: 'ok', text: t('staff.grow.slug.available') };
    return { tone: 'error', text: t(`staff.grow.slug.reason.${check.reason}`) };
  })();
  const canSave = candidate !== current && !local && fresh && check?.available;
  const suggestions = check?.suggestions ?? [];
  const formerAddresses = aliases ?? data.slug.aliases ?? [];

  const save = async () => {
    try {
      const result = await changeCall.call({ business: data.business.key, slug: candidate });
      setAliases(result.message.aliases);
      setConfirming(false);
      toast.success(fill(t('staff.grow.slug.changed'), result.message.short));
      onChanged();
    } catch (error) {
      toast.error(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]) || t('staff.grow.slug.changeFailed'));
    }
  };

  return (
    <GrowCard qa="grow-short-link" icon={AtSign} title={t(page ? 'staff.grow.slug.providerPageTitle' : 'staff.grow.slug.title')}
      description={t(page ? 'staff.grow.slug.providerPageDescription' : 'staff.grow.slug.description')}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="grow-slug" className="text-sm font-medium">{t('staff.grow.slug.label')}</Label>
          <div className="mt-1.5 flex min-w-0 items-stretch overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
            <span className="flex shrink-0 items-center border-r bg-muted px-3 text-sm text-muted-foreground">{host}/</span>
            <Input
              id="grow-slug"
              data-qa="grow-slug-input"
              value={text}
              maxLength={data.slug.rules.max + 10}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
              className="h-11 min-w-0 rounded-none border-0 font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-describedby="grow-slug-status"
            />
          </div>
          <p
            id="grow-slug-status"
            data-qa="grow-slug-status"
            data-state={status.tone}
            aria-live="polite"
            className={
              'mt-1.5 flex min-h-5 items-center gap-1.5 text-sm ' +
              (status.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : status.tone === 'error' ? 'text-destructive' : 'text-muted-foreground')
            }
          >
            {status.tone === 'ok' ? <Check className="h-4 w-4" aria-hidden="true" /> : status.tone === 'error' ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : isLoading && candidate !== current ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {status.text}
          </p>
          {page && current && <p className="mt-1 text-xs text-muted-foreground" data-qa="grow-slug-full">
            {t('staff.grow.slug.providerPageFull')}: <span className="break-all font-medium text-foreground">{`${window.location.host}/schedule/p/${current}`}</span>
          </p>}
          {page && current.startsWith('book-') && <p className="mt-2 text-sm text-muted-foreground" data-qa="grow-slug-nudge">{t('staff.grow.slug.providerPageNudge')}</p>}
        </div>

        {suggestions.length > 0 && (
          <div data-qa="grow-slug-suggestions">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t('staff.grow.slug.suggestions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((slug) => (
                <Button key={slug} type="button" variant="outline" className="h-11 rounded-full px-4" data-qa="grow-slug-suggestion" onClick={() => setText(slug)}>
                  {host}/{slug}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-sm text-xs text-muted-foreground">{t('staff.grow.slug.keepsWorking')}</p>
          <Button data-qa="grow-slug-save" size="lg" disabled={!canSave} onClick={() => setConfirming(true)}>
            {t('staff.grow.slug.save')}
          </Button>
        </div>

        {formerAddresses.length > 0 && (
          <div data-qa="grow-slug-aliases" className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              {t('staff.grow.slug.former')}
            </p>
            <p className="mt-1 break-all text-foreground">{formerAddresses.map((slug) => `${host}/${slug}`).join(' · ')}</p>
          </div>
        )}

        {page && (
          <div data-qa="grow-slug-website" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5">
            <p className="text-sm text-muted-foreground">{t('staff.grow.slug.providerPageWebsite')}</p>
            <Button asChild variant="ghost" size="sm" className="min-h-11">
              <Link to="/settings/website"><Globe aria-hidden="true" />{t('staff.grow.slug.createSite')}</Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent data-qa="grow-slug-confirm">
          <DialogHeader>
            <DialogTitle>{t('staff.grow.slug.confirmTitle')}</DialogTitle>
            <DialogDescription>{fill(t('staff.grow.slug.confirmBody'), `${host}/${current}`, `${host}/${candidate}`)}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="lg" onClick={() => setConfirming(false)} data-qa="grow-slug-cancel">{t('staff.grow.slug.cancel')}</Button>
            <Button size="lg" onClick={save} disabled={changeCall.loading} data-qa="grow-slug-confirm-save">
              {changeCall.loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t('staff.grow.slug.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GrowCard>
  );
}
