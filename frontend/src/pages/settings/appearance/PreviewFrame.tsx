import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CompiledDesign } from '@/public-experience/types';
import { useTranslation } from '@/lib/i18n';

/** Give template media queries a real viewport rather than an admin column. */
export function PreviewFrame({ children, mobile, design, onEscape }: { children: ReactNode; mobile: boolean; design: CompiledDesign; onEscape?: () => void }) {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const escape = useRef(onEscape);
  escape.current = onEscape;
  const frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  const fontCSS = design.typography.fontAssets.map(asset => `@font-face{font-family:${JSON.stringify(asset.family)};src:url(${JSON.stringify(asset.src)});font-weight:${asset.weight};font-display:swap;}`).join('\n');
  useEffect(() => {
    if (!target) return;
    const document = target.ownerDocument;
    const fonts = document.createElement('style');
    fonts.textContent = fontCSS;
    document.head.append(fonts);
    return () => fonts.remove();
  }, [target, fontCSS]);
  const viewport = mobile ? 390 : 1280;
  const height = mobile ? 844 : 900;
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const initialize = () => {
    const document = frame.current?.contentDocument;
    if (!document) return;
    document.head.replaceChildren();
    for (const element of window.document.head.querySelectorAll('style,link[rel="stylesheet"]')) document.head.append(element.cloneNode(true));
    const fonts = document.createElement('style');
    fonts.textContent = 'html,body{margin:0;padding:0}';
    document.head.append(fonts);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.defaultPrevented) escape.current?.(); });
    setTarget(document.body);
  };
  const scale = Math.min(1, width / viewport);
  return <div ref={container} className="preview-frame-container" style={{ height: height * scale }}>
    <iframe ref={frame} title={t('staff.website.preview.frameTitle')} sandbox="allow-same-origin" srcDoc="<!doctype html><html><head></head><body></body></html>" onLoad={initialize} style={{ width: viewport, height, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }}/>
    {target && createPortal(children, target)}
  </div>;
}
