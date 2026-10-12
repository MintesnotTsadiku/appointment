import { useEffect, useMemo, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { CalendarHeart, Download, ImageOff, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Skeleton } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/states';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useAnalyticsScope } from '@/components/analytics/WorkspaceDashboard';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';
import { cn } from '@/lib/utils';
import {
  REVIEW_SOURCE, dateRange, fillText, imageUrl, reviewTiles, telegramShareUrl, withSource,
  type YearReviewStats,
} from '../year-review-core';

interface Period {
  key: string;
  calendar: 'ethiopian' | 'gregorian';
  year: number;
  so_far: boolean;
  start: string;
  end: string;
  labels: { en: string; am: string };
}

interface Summary {
  enabled: boolean;
  periods: Period[];
  period: string | null;
  review: { ready: boolean; start: string; end: string; stats: YearReviewStats } | null;
  business?: { name: string; url: string; short: string };
  captions?: { en: string; am: string };
}

type Size = 'portrait' | 'story';

/** Grow page: the owner's year in numbers as a shareable image (post or story, English or Amharic). */
export default function YearReviewSection() {
  const { t, language } = useTranslation();
  const brand = usePlatformBrand();
  const { organization, manager } = useAnalyticsScope();
  const [period, setPeriod] = useState<string | null>(null);
  // The image follows the app language until the owner picks one.
  const [pickedLanguage, setImageLanguage] = useState<string | null>(null);
  const imageLanguage = pickedLanguage ?? (language === 'am' ? 'am' : 'en');
  const [size, setSize] = useState<Size>('portrait');
  const params = organization ? { business: organization, ...(period ? { period } : {}) } : undefined;
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Summary }>(
    'appointment.growth.year_review.summary', params, organization && manager ? `year-review-${organization}-${period ?? 'default'}` : null,
    { revalidateOnFocus: false },
  );
  const summary = data?.message;
  const tr = (key: string) => t(`staff.grow.yearReview.${key}`);
  // The Insights card links to /grow#year-review; scroll there once the section has content.
  useEffect(() => {
    if (summary && window.location.hash === '#year-review') document.getElementById('year-review')?.scrollIntoView({ block: 'start' });
  }, [summary]);

  if (!organization || !manager || !brand.growth.yearReviewEnabled || summary?.enabled === false) return null;

  const chosen = summary?.periods.find((row) => row.key === (period ?? summary.period));
  const review = summary?.review;
  return (
    <Card id="year-review" data-qa="year-review-section" className="overflow-hidden">
      <CardHeader className="gap-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarHeart className="size-5 text-primary" aria-hidden="true" />
          {tr('title')}
        </CardTitle>
        <CardDescription>{tr('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            {tr('period')}
            <Select value={chosen?.key ?? ''} onValueChange={setPeriod} disabled={!summary}>
              <SelectTrigger data-qa="year-review-period" className="h-11">
                <SelectValue placeholder={tr('period')} />
              </SelectTrigger>
              <SelectContent>
                {summary?.periods.map((row) => (
                  <SelectItem key={row.key} value={row.key} data-qa={`year-review-period-${row.key}`}>
                    {language === 'am' ? row.labels.am : row.labels.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid gap-1.5 text-sm font-medium">
            <span id="year-review-language">{tr('imageLanguage')}</span>
            <ToggleGroup type="single" value={imageLanguage} onValueChange={(value) => value && setImageLanguage(value)} aria-labelledby="year-review-language" className="w-fit">
              <ToggleGroupItem value="en" data-qa="year-review-lang-en" className="h-9 px-3">English</ToggleGroupItem>
              <ToggleGroupItem value="am" data-qa="year-review-lang-am" className="h-9 px-3" lang="am">አማርኛ</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid gap-1.5 text-sm font-medium">
            <span id="year-review-size">{tr('format')}</span>
            <ToggleGroup type="single" value={size} onValueChange={(value) => value && setSize(value as Size)} aria-labelledby="year-review-size" className="w-fit">
              <ToggleGroupItem value="portrait" data-qa="year-review-size-portrait" className="h-9 px-3">{tr('post')}</ToggleGroupItem>
              <ToggleGroupItem value="story" data-qa="year-review-size-story" className="h-9 px-3">{tr('story')}</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {isLoading && !summary ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 rounded-lg" />)}</div>
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          </div>
        ) : error || !summary ? (
          <ErrorState title={tr('errorTitle')} description={tr('errorDescription')} onRetry={() => void mutate()} />
        ) : !review?.ready || !chosen ? (
          <EmptyState icon={CalendarHeart} title={tr('notReadyTitle')} description={tr('notReadyDescription')} />
        ) : (
          <Ready
            business={organization}
            period={chosen}
            stats={review.stats}
            imageLanguage={imageLanguage}
            size={size}
            link={withSource(summary.business?.url || '', REVIEW_SOURCE)}
            captions={summary.captions}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface ReadyProps {
  business: string;
  period: Period;
  stats: YearReviewStats;
  imageLanguage: string;
  size: Size;
  link: string;
  captions?: { en: string; am: string };
}

function Ready({ business, period, stats, imageLanguage, size, link, captions }: ReadyProps) {
  const { t, language } = useTranslation();
  const tr = (key: string) => t(`staff.grow.yearReview.${key}`);
  const tiles = useMemo(() => reviewTiles(stats, language, tr), [stats, language, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const src = imageUrl(business, period.key, imageLanguage, size);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sharing, setSharing] = useState(false);
  useEffect(() => setState('loading'), [src]);
  const periodLabel = imageLanguage === 'am' ? period.labels.am : period.labels.en;
  const caption = (imageLanguage === 'am' ? captions?.am : captions?.en) || periodLabel;
  const fileName = `year-in-review-${period.key}-${imageLanguage}-${size}.png`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const share = async () => {
    setSharing(true);
    try {
      const blob = await fetch(src, { credentials: 'same-origin' }).then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      });
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: periodLabel, text: `${caption} ${link}`.trim() });
      else await navigator.share({ title: periodLabel, text: caption, url: link || undefined });
    } catch (reason) {
      if ((reason as Error)?.name !== 'AbortError') toast.error(tr('shareFailed'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground" data-qa="year-review-range">
          {fillText(tr('rangeDates'), { period: language === 'am' ? period.labels.am : period.labels.en, dates: dateRange(period.start, period.end, language) })}
        </p>
        <dl className="grid grid-cols-2 gap-3" data-qa="year-review-stats">
          {tiles.map((tile, index) => (
            <div key={tile.key} data-qa={`year-review-stat-${tile.key}`} className={cn('min-w-0 rounded-lg border bg-muted/30 p-4', index === 0 && 'col-span-2 bg-primary/5 sm:col-span-1')}>
              <dt className="text-xs font-medium text-muted-foreground">{tile.label}</dt>
              <dd className={cn('mt-1 font-semibold leading-tight tabular-nums text-foreground [overflow-wrap:anywhere]', index === 0 ? 'text-3xl' : 'text-xl')}>{tile.value}</dd>
              {tile.note && <dd className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{tile.note}</dd>}
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{tr('hiddenNote')}</p>
      </div>

      <div className="space-y-3">
        <div className={cn('relative mx-auto w-full overflow-hidden rounded-xl border bg-muted shadow-sm', size === 'story' ? 'aspect-[9/16] max-w-[15rem]' : 'aspect-[4/5] max-w-[20rem]')}>
          {state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
          {state === 'error' ? (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-foreground">
              <span className="grid justify-items-center gap-2"><ImageOff className="size-6" aria-hidden="true" />{tr('previewFailed')}</span>
            </div>
          ) : (
            <img
              key={src}
              src={src}
              alt={fillText(tr('previewAlt'), { period: periodLabel })}
              data-qa="year-review-preview"
              onLoad={() => setState('ready')}
              onError={() => setState('error')}
              className={cn('size-full object-cover transition-opacity', state === 'ready' ? 'opacity-100' : 'opacity-0')}
            />
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <a href={src} download={fileName} data-qa="year-review-download" className={buttonVariants({ className: 'h-11' })}>
            <Download aria-hidden="true" />{tr('download')}
          </a>
          {canShare && (
            <Button type="button" variant="outline" className="h-11" onClick={() => void share()} disabled={sharing || state !== 'ready'} data-qa="year-review-share">
              <Share2 aria-hidden="true" />{tr('share')}
            </Button>
          )}
          <a
            href={telegramShareUrl(link, caption)}
            target="_blank"
            rel="noopener noreferrer"
            data-qa="year-review-telegram"
            className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          >
            <Send aria-hidden="true" />{tr('telegram')}
          </a>
        </div>
        <p className="text-xs text-muted-foreground">{tr('telegramHint')}</p>
      </div>
    </div>
  );
}
