import { useEffect, useRef, useState } from 'react';
import { Download, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Skeleton } from '@/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import { GrowCard } from '../components';
import { POSTER_API, type GrowContext } from '../types';

type Size = 'A4' | 'A5';
type Theme = 'light' | 'dark' | 'brand';
type Languages = 'both' | 'am' | 'en';
/** Page size in CSS pixels (96 dpi). */
const PAGE: Record<Size, [number, number]> = { A4: [794, 1123], A5: [559, 794] };

/** A printable counter poster with a QR code to the booking page and hours in both clocks. */
export default function PosterSection({ data }: { data: GrowContext }) {
  const { t, language } = useTranslation();
  const [size, setSize] = useState<Size>('A4');
  const [theme, setTheme] = useState<Theme>('light');
  const [languages, setLanguages] = useState<Languages>('both');
  const places = data.posters.locations;
  const [location, setLocation] = useState(places[0]?.name ?? '');
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!data.posters.enabled) return null;
  const params = new URLSearchParams({ business: data.business.key, size, theme, languages, ...(location ? { location } : {}) });
  const view = `${POSTER_API}?${params}&format=html`;
  const pdf = `${POSTER_API}?${params}&format=pdf`;
  const [pageWidth, pageHeight] = PAGE[size];
  const scale = Math.min(1, width / pageWidth);

  return (
    <GrowCard qa="grow-poster" icon={QrCode} title={t('staff.grow.poster.title')} description={t('staff.grow.poster.description')}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="order-2 space-y-5 lg:order-1">
          <Option label={t('staff.grow.poster.size')}>
            <ToggleGroup type="single" value={size} onValueChange={(value) => { if (value) { setLoaded(false); setSize(value as Size); } }} aria-label={t('staff.grow.poster.size')}>
              {(['A4', 'A5'] as Size[]).map((value) => (
                <ToggleGroupItem key={value} value={value} data-qa={`grow-poster-size-${value.toLowerCase()}`} className="min-h-10 px-4">
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Option>
          <Option label={t('staff.grow.poster.theme')}>
            <ToggleGroup type="single" value={theme} onValueChange={(value) => { if (value) { setLoaded(false); setTheme(value as Theme); } }} aria-label={t('staff.grow.poster.theme')} className="flex-wrap">
              {(['light', 'dark', 'brand'] as Theme[]).map((value) => (
                <ToggleGroupItem key={value} value={value} data-qa={`grow-poster-theme-${value}`} className="min-h-10 px-3">
                  {t(`staff.grow.poster.themes.${value}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Option>
          <Option label={t('staff.grow.poster.languages')} htmlFor="grow-poster-languages">
            <Select value={languages} onValueChange={(value) => { setLoaded(false); setLanguages(value as Languages); }}>
              <SelectTrigger id="grow-poster-languages" data-qa="grow-poster-languages" className="h-11 w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">{t('staff.grow.poster.languageBoth')}</SelectItem>
                <SelectItem value="am">አማርኛ</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Option>
          {places.length > 1 && (
            <Option label={t('staff.grow.poster.location')} htmlFor="grow-poster-location">
              <Select value={location} onValueChange={(value) => { setLoaded(false); setLocation(value); }}>
                <SelectTrigger id="grow-poster-location" data-qa="grow-poster-location" className="h-11 w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.name} value={place.name}>{place.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Option>
          )}
          <p className="text-sm text-muted-foreground">{t('staff.grow.poster.clocks')}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" data-qa="grow-poster-download" className="flex-1 sm:flex-none">
              <a href={pdf} download>
                <Download aria-hidden="true" />
                {t('staff.grow.poster.download')}
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              data-qa="grow-poster-print"
              className="flex-1 sm:flex-none"
              disabled={!loaded}
              onClick={() => frame.current?.contentWindow?.print()}
            >
              <Printer aria-hidden="true" />
              {t('staff.grow.poster.print')}
            </Button>
            <Button asChild variant="ghost" size="lg" data-qa="grow-poster-open" className="flex-1 sm:flex-none">
              <a href={view} target="_blank" rel="noopener noreferrer">{t('staff.grow.poster.open')}</a>
            </Button>
          </div>
        </div>

        <div ref={box} className="order-1 min-w-0 lg:order-2">
          <div
            className="relative mx-auto overflow-hidden rounded-lg border bg-muted shadow-sm"
            style={{ width: pageWidth * scale, height: pageHeight * scale }}
          >
            {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
            <iframe
              ref={frame}
              key={view}
              src={view}
              title={t('staff.grow.poster.previewTitle')}
              lang={language}
              data-qa="grow-poster-preview"
              onLoad={() => setLoaded(true)}
              className="absolute left-0 top-0 origin-top-left border-0 bg-white"
              style={{ width: pageWidth, height: pageHeight, transform: `scale(${scale})` }}
            />
          </div>
        </div>
      </div>
    </GrowCard>
  );
}

function Option({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
