import { useEffect, useRef } from 'react';
import type { PublishedSnapshot } from '@/public-experience/types';
import { WebsitePreview } from '../website-preview';

export function AppearancePreview({ snapshot, dirty, fullScreen, onClose }: {
  snapshot: PublishedSnapshot | null; dirty: boolean; fullScreen: boolean; onClose: () => void;
}) {
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
  return <aside ref={root} className="appearance-preview" data-fullscreen={fullScreen} role={fullScreen ? 'dialog' : undefined} aria-modal={fullScreen || undefined} aria-label="Website preview" onKeyDown={event => {
    if (!fullScreen || event.defaultPrevented) return;
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length);
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><button type="button" className="appearance-mobile-preview" onClick={onClose}>← Back to appearance</button><div className="appearance-preview-status"><strong>Website preview</strong><span>{dirty ? 'Unsaved choices · preview only' : 'Published website is unchanged'}</span></div>{snapshot ? <WebsitePreview snapshot={snapshot} onEscape={fullScreen ? onClose : undefined}/> : <p>Choose your palette and fonts, then Save & preview to review the website.</p>}</aside>;
}
