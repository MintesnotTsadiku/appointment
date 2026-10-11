import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Link2, MessageCircle, RotateCcw, Send, Share2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';
import { useTranslation } from '@/lib/i18n';
import { GrowCard } from '../components';
import { copyText } from '../copy';
import { fillMessage, swapLink, telegramShareUrl, whatsappShareUrl, type ShareSource } from '../share-core';
import type { GrowContext, Lang } from '../types';

const STAT_SOURCES: ShareSource[] = ['telegram_share', 'whatsapp_share', 'qr_poster', 'copy_link'];

/** The booking link with ready messages in both languages and one-tap sharing. */
export default function ShareSection({ data }: { data: GrowContext }) {
  const { t, language } = useTranslation();
  const { tracked } = data.link;
  const name = data.business.name;
  const initial = useMemo(
    () => ({
      en: fillMessage(data.messages.templates.en, name, tracked.telegram_share),
      am: fillMessage(data.messages.templates.am, name, tracked.telegram_share),
    }),
    [data.messages.templates, name, tracked.telegram_share]
  );
  const [lang, setLang] = useState<Lang>(language === 'am' ? 'am' : 'en');
  const [drafts, setDrafts] = useState<Record<Lang, string>>(initial);
  const message = drafts[lang];
  const edited = message !== initial[lang];
  const forChannel = (source: ShareSource) => swapLink(message, tracked.telegram_share, tracked[source]);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const nativeShare = async () => {
    try {
      await navigator.share({ title: name, text: forChannel('web_share').split(tracked.web_share).join('').trim(), url: tracked.web_share });
    } catch {
      /* The owner closed the share sheet. */
    }
  };

  return (
    <GrowCard qa="grow-share" icon={Share2} title={t('staff.grow.share.title')} description={t('staff.grow.share.description')}>
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('staff.grow.share.yourLink')}</p>
          <p data-qa="grow-share-link" className="mt-1 break-all text-lg font-semibold text-foreground sm:text-xl">
            {data.link.short || data.link.url.replace(/^https?:\/\//, '')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              data-qa="grow-copy-link"
              variant="outline"
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() => copyText(tracked.copy_link, t('staff.grow.share.linkCopied'), t('staff.grow.share.copyFailed'))}
            >
              <Copy aria-hidden="true" />
              {t('staff.grow.share.copyLink')}
            </Button>
            <Button data-qa="grow-open-link" variant="ghost" size="lg" className="flex-1 sm:flex-none" asChild>
              <a href={data.link.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                {t('staff.grow.share.openLink')}
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="grow-share-message" className="text-sm font-medium">{t('staff.grow.share.message')}</Label>
            <ToggleGroup
              type="single"
              value={lang}
              onValueChange={(value) => value && setLang(value as Lang)}
              aria-label={t('staff.grow.share.messageLanguage')}
              data-qa="grow-message-lang"
            >
              <ToggleGroupItem value="am" data-qa="grow-message-lang-am" className="min-h-9 px-3">አማርኛ</ToggleGroupItem>
              <ToggleGroupItem value="en" data-qa="grow-message-lang-en" className="min-h-9 px-3">English</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Textarea
            id="grow-share-message"
            data-qa="grow-share-message"
            lang={lang}
            rows={4}
            value={message}
            onChange={(event) => setDrafts((current) => ({ ...current, [lang]: event.target.value }))}
            className="resize-y text-base leading-relaxed"
          />
          <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{t('staff.grow.share.messageHint')}</span>
            {edited && (
              <button
                type="button"
                data-qa="grow-message-reset"
                className="inline-flex min-h-6 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setDrafts((current) => ({ ...current, [lang]: initial[lang] }))}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('staff.grow.share.reset')}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button data-qa="grow-share-telegram" size="lg" className="w-full sm:col-span-2" asChild>
            <a href={telegramShareUrl(tracked.telegram_share, message)} target="_blank" rel="noopener noreferrer">
              <Send aria-hidden="true" />
              {t('staff.grow.share.telegram')}
            </a>
          </Button>
          <Button data-qa="grow-share-whatsapp" variant="outline" size="lg" className="w-full" asChild>
            <a href={whatsappShareUrl(forChannel('whatsapp_share'))} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              {t('staff.grow.share.whatsapp')}
            </a>
          </Button>
          <Button
            data-qa="grow-copy-message"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => copyText(forChannel('copy_link'), t('staff.grow.share.messageCopied'), t('staff.grow.share.copyFailed'))}
          >
            <Copy aria-hidden="true" />
            {t('staff.grow.share.copyMessage')}
          </Button>
          {canNativeShare && (
            <Button data-qa="grow-share-native" variant="secondary" size="lg" className="w-full sm:col-span-2" onClick={nativeShare}>
              <Share2 aria-hidden="true" />
              {t('staff.grow.share.more')}
            </Button>
          )}
        </div>

        <div data-qa="grow-share-stats">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('staff.grow.stats.title').replace('{0}', String(data.stats.days))}
          </p>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {STAT_SOURCES.map((source) => (
              <div key={source} className="rounded-lg border px-3 py-2.5">
                <dt className="truncate text-xs text-muted-foreground">{t(`staff.grow.stats.${source}`)}</dt>
                <dd className="mt-1 text-sm text-foreground">
                  <span className="text-lg font-semibold tabular-nums">{data.stats.visits[source] ?? 0}</span>{' '}
                  <span className="text-muted-foreground">{t('staff.grow.stats.visits')}</span>
                  <span className="block text-xs text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">{data.stats.bookings[source] ?? 0}</span> {t('staff.grow.stats.bookings')}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </GrowCard>
  );
}
