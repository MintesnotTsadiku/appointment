import { ArrowUpRight } from 'lucide-react';
import { PlatformMark } from '@/components/platform-mark';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand, type PlatformBrand } from '@/lib/platform-brand';
import { cn } from '@/lib/utils';

export interface PoweredByProps {
  /** "inline" sits under a booking card; "footer" adds a hairline and more room. */
  variant?: 'inline' | 'footer';
  /** Sign-up `source` recorded for a business that starts from this link. */
  source?: string;
  /** Show the "own booking page" invitation when Growth Settings allow it. */
  showCta?: boolean;
  className?: string;
  /** Render with these values instead of the live brand (the admin preview). */
  brandOverride?: PlatformBrand;
}

/** Sign-up address on the product site, tagged with the channel. */
export function signupUrl(productUrl: string, source: string): string {
  const base = productUrl.replace(/\/+$/, '');
  return `${base}/signup?source=${encodeURIComponent(source)}`;
}

/** "<mark> Powered by <product>" and, when enabled, a quiet invitation to make an own page. */
const PoweredBy = ({ variant = 'inline', source = 'powered_by_page', showCta = true, className, brandOverride }: PoweredByProps) => {
  const { t } = useTranslation();
  const live = usePlatformBrand();
  const brand = brandOverride ?? live;
  // The catalog keeps the word order per language: "Powered by {product}" / "በ{product} የሚሠራ".
  const [before, after = ''] = t('platformBrand.poweredBy').split('{product}');
  const cta = showCta && brand.growth.poweredByPages && brand.growth.ownPageText;
  return (
    <div
      data-powered-by
      data-qa="powered-by"
      className={cn(
        'flex w-full shrink-0 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground',
        variant === 'footer' ? 'mt-6 border-t border-border/60 px-4 pb-24 pt-5 md:pb-6' : 'py-5 max-md:pb-20 max-lg:py-3',
        className,
      )}
    >
      <p className="flex flex-wrap items-center justify-center">
        <PlatformMark brand={brand} size={18} className="mr-2" />
        {before && <span className="whitespace-pre">{before}</span>}
        <a
          href={brand.productUrl}
          target="_blank"
          rel="noopener"
          data-qa="powered-by-product"
          className="inline-flex min-h-11 items-center rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
        >
          {brand.productName}
        </a>
        {after && <span className="whitespace-pre">{after}</span>}
      </p>
      {cta && (
        <a
          href={signupUrl(brand.productUrl, source)}
          target="_blank"
          rel="noopener"
          data-qa="powered-by-cta"
          data-powered-by-cta
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground no-underline underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
        >
          {brand.growth.ownPageText}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
};

export default PoweredBy;
