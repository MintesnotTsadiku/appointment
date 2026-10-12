import { useState } from 'react';
import { ImageOff, MessageSquareText } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import { GrowCard } from '../components';
import type { GrowContext, Lang } from '../types';

/** A chat-style preview of the card Telegram, Facebook and WhatsApp show for the link. */
export default function LinkPreviewSection({ data }: { data: GrowContext }) {
  const { t, language } = useTranslation();
  // The preview follows the app language until the owner picks one.
  const [picked, setLang] = useState<Lang | null>(null);
  const lang: Lang = picked ?? (language === 'am' ? 'am' : 'en');
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const preview = data.preview?.[lang];
  if (!preview) return null;
  const link = data.link.short || data.link.url.replace(/^https?:\/\//, '');

  return (
    <GrowCard
      qa="grow-preview"
      icon={MessageSquareText}
      title={t('staff.grow.preview.title')}
      description={t('staff.grow.preview.description')}
      actions={
        <ToggleGroup type="single" value={lang} onValueChange={(value) => value && setLang(value as Lang)} aria-label={t('staff.grow.preview.language')}>
          <ToggleGroupItem value="am" data-qa="grow-preview-lang-am" className="min-h-9 px-3">አማ</ToggleGroupItem>
          <ToggleGroupItem value="en" data-qa="grow-preview-lang-en" className="min-h-9 px-3">EN</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="rounded-xl bg-muted/60 p-3 sm:p-4">
        <div data-qa="grow-preview-bubble" className="ml-auto max-w-[400px] rounded-2xl rounded-br-md border bg-background p-2.5 shadow-xs">
          <p className="break-all px-1 pb-2 text-sm text-primary underline underline-offset-2">{link}</p>
          <div className="flex gap-2 rounded-md border-l-[3px] border-primary bg-primary/5 p-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xs font-semibold text-primary">{preview.host}</p>
              <p data-qa="grow-preview-title" className="text-sm font-semibold leading-snug text-foreground">{preview.title}</p>
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{preview.description}</p>
              <div className="pt-1.5">
                {broken[preview.image] ? (
                  <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ImageOff className="h-6 w-6" aria-hidden="true" />
                  </div>
                ) : (
                  <img
                    data-qa="grow-preview-image"
                    src={preview.image}
                    alt={t('staff.grow.preview.imageAlt')}
                    width={1200}
                    height={630}
                    loading="lazy"
                    onError={() => setBroken((current) => ({ ...current, [preview.image]: true }))}
                    className="aspect-[1200/630] w-full rounded-md border object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t('staff.grow.preview.note')}</p>
    </GrowCard>
  );
}
