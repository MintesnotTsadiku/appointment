import { useEffect, useRef } from 'react';
import type { PublishedSnapshot } from '@/public-experience/types';
import { WebsitePreview } from '../website-preview';
import { useTranslation } from '@/lib/i18n';

export function AppearancePreview({ snapshot, dirty, fullScreen, onClose }: {
  snapshot: PublishedSnapshot | null; dirty: boolean; fullScreen: boolean; onClose: () => void;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!fullScreen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const background = Array.from(document.querySelectorAll<HTMLElement>('[data-page="website-setup"] > :not(.appearance-workspace), .appearance-controls'));
    background.forEach(element => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close.current(); } };
    document.addEventListener('keydown', dismiss);
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', dismiss);
      background.forEach(element => { element.inert = false; });
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [fullScreen]);
  return <aside ref={root} className="appearance-preview" data-fullscreen={fullScreen} role={fullScreen ? 'dialog' : undefined} aria-modal={fullScreen || undefined} aria-label={t("staff.website.appearance.previewTitle")} onKeyDown={event => {
    if (!fullScreen || event.defaultPrevented) return;
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length);
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><button type="button" className="appearance-mobile-preview" onClick={onClose}>{t("staff.website.appearance.back")}</button><div className="appearance-preview-status"><strong>{t("staff.website.appearance.previewTitle")}</strong><span>{dirty ? t('staff.website.appearance.unsaved') : t('staff.website.appearance.unchanged')}</span></div>{snapshot ? <WebsitePreview snapshot={snapshot} onEscape={fullScreen ? onClose : undefined}/> : <p>{t("staff.website.appearance.choosePrompt")}</p>}</aside>;
}
