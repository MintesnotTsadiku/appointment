import { MessageCircle } from 'lucide-react';
import PoweredBy from '@/components/powered-by';
import { PlatformMark } from '@/components/platform-mark';
import { useTranslation } from '@/lib/i18n';
import { shareText, toPlatformBrand } from '@/lib/platform-brand';
import type { Settings } from './types';

/** Live preview of the unsaved values: the "Powered by" mark and a shared link message. */
export function Preview({ draft }: { draft: Settings }) {
  const { t, language } = useTranslation();
  const brand = toPlatformBrand({ brand: { ...draft.brand }, growth: { ...draft.growth } } as never, language);
  const business = t('staff.brandGrowth.preview.sampleBusiness');
  const link = `https://${brand.shortHost}/hana`;
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-card" data-qa="brand-preview" aria-labelledby="brand-preview-title">
      <header className="border-b px-5 py-4">
        <h2 id="brand-preview-title" className="text-base font-semibold text-foreground">{t('staff.brandGrowth.preview.title')}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('staff.brandGrowth.preview.description')}</p>
      </header>
      <div className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('staff.brandGrowth.preview.bookingPage')}</p>
          <div className="rounded-lg border bg-background">
            <div className="space-y-2 p-4" aria-hidden="true">
              <div className="h-2.5 w-2/5 rounded-full bg-muted" />
              <div className="h-2.5 w-3/5 rounded-full bg-muted/70" />
              <div className="mt-3 h-8 w-full rounded-md" style={{ backgroundColor: brand.primaryColor || 'var(--accent-primary)' }} />
            </div>
            <div className="border-t" data-qa="brand-preview-powered-by">
              <PoweredBy brandOverride={brand} className="py-3 max-md:pb-3 max-lg:py-3" />
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('staff.brandGrowth.preview.shareMessage')}</p>
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400" aria-hidden="true">
              <MessageCircle className="size-4" />
            </span>
            <p className="min-w-0 rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]" data-qa="brand-preview-share">
              {shareText(brand.growth.shareMessage, business, link)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
          <PlatformMark brand={brand} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground" data-qa="brand-preview-name">{brand.productName}</p>
            <p className="truncate text-xs text-muted-foreground">{brand.tagline || brand.shortHost}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
