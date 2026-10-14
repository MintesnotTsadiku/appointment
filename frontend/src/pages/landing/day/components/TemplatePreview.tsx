import * as Dialog from "@radix-ui/react-dialog";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Monitor, Moon, Smartphone, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { useBrandedTranslation } from "@/lib/platform-brand";
import { fill } from "../../shared/offer";
import { fitScale, previewSrc, type GalleryTemplate, type Mode, type Viewport } from "../../shared/templateGallery";

/** The page sizes the preview renders before scaling it into the stage. */
const PAGE: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const PHONE_BEZEL = 12;

type FrameState = "loading" | "live" | "picture";

/**
 * In-page preview: the live showcase in a frame at desktop or phone size, in
 * light or dark. Where the showcase cannot be framed (not published, or the
 * server forbids framing) it shows the template's screenshot instead.
 */
const TemplatePreview = ({ template, useHref, onClose }: { template: GalleryTemplate; useHref: string; onClose: () => void }) => {
  const { t, language } = useBrandedTranslation();
  const [viewport, setViewport] = useState<Viewport>(() => (window.matchMedia?.("(max-width: 720px)").matches ? "mobile" : "desktop"));
  const [mode, setMode] = useState<Mode>(template.themes[0] ?? "light");
  const [frame, setFrame] = useState<FrameState>(template.showcase ? "loading" : "picture");
  const stage = useStageSize();
  const src = template.showcase ? previewSrc(template.showcase.path, language, mode) : null;
  const name = { template: template.label };

  useEffect(() => {
    if (src) setFrame((current) => (current === "picture" ? current : "loading"));
  }, [src]);

  const onLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const page = event.currentTarget.contentDocument;
      setFrame(page && page.URL !== "about:blank" && page.body?.childElementCount ? "live" : "picture");
    } catch {
      // A refused frame becomes an opaque error page.
      setFrame("picture");
    }
  };

  const picture = template.previews[viewport] ?? template.previews.desktop ?? template.hero;
  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="lw-preview-overlay" />
        <Dialog.Content className="lw-preview" data-qa="template-preview" data-viewport={viewport} data-mode={mode} aria-describedby="lw-preview-for">
          <header className="lw-preview-bar">
            <div className="lw-preview-heading">
              <Dialog.Title className="lw-preview-title">{template.label}</Dialog.Title>
              <Dialog.Description id="lw-preview-for" className="lw-preview-for">
                {template.showcase?.title || template.audience}
              </Dialog.Description>
            </div>
            <div className="lw-preview-controls">
              <ToggleGroup.Root
                type="single"
                value={viewport}
                onValueChange={(value) => value && setViewport(value as Viewport)}
                className="lw-segment"
                aria-label={t("world.gallery.viewport")}
              >
                <ToggleGroup.Item value="desktop" className="lw-segment-item" data-qa="template-preview-desktop">
                  <Monitor aria-hidden="true" size={16} /> <span>{t("world.gallery.desktop")}</span>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="mobile" className="lw-segment-item" data-qa="template-preview-mobile">
                  <Smartphone aria-hidden="true" size={16} /> <span>{t("world.gallery.mobile")}</span>
                </ToggleGroup.Item>
              </ToggleGroup.Root>
              {template.themes.length > 1 && (
                <ToggleGroup.Root
                  type="single"
                  value={mode}
                  onValueChange={(value) => value && setMode(value as Mode)}
                  className="lw-segment"
                  aria-label={t("world.gallery.mode")}
                  disabled={!template.showcase || frame === "picture"}
                >
                  <ToggleGroup.Item value="light" className="lw-segment-item" data-qa="template-preview-light">
                    <Sun aria-hidden="true" size={16} /> <span>{t("world.gallery.light")}</span>
                  </ToggleGroup.Item>
                  <ToggleGroup.Item value="dark" className="lw-segment-item" data-qa="template-preview-dark">
                    <Moon aria-hidden="true" size={16} /> <span>{t("world.gallery.dark")}</span>
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              )}
            </div>
            <div className="lw-preview-actions">
              {template.showcase && (
                <a className="lw-preview-link" href={template.showcase.path} target="_blank" rel="noopener" data-qa="template-preview-live">
                  {t("world.gallery.live")} <span aria-hidden="true">↗</span>
                </a>
              )}
              <a className="lw-preview-use" href={useHref} data-qa="template-preview-use">{t("world.gallery.use")}</a>
              <Dialog.Close className="lw-preview-close" aria-label={t("world.gallery.close")} data-qa="template-preview-close">
                <X aria-hidden="true" size={20} />
              </Dialog.Close>
            </div>
          </header>
          <div ref={stage.ref} className="lw-preview-stage">
            {src && frame !== "picture" ? (
              stage.width > 0 && <Device viewport={viewport} width={stage.width} height={stage.height}>
                <iframe
                  key={src}
                  src={src}
                  title={fill(t("world.gallery.frameTitle"), name)}
                  onLoad={onLoad}
                  data-qa="template-preview-frame"
                  referrerPolicy="same-origin"
                />
              </Device>
            ) : (
              picture && (
                <img
                  className="lw-preview-picture"
                  data-viewport={viewport}
                  src={picture}
                  alt={fill(t(viewport === "mobile" ? "world.gallery.mobileAlt" : "world.gallery.desktopAlt"), name)}
                  data-qa="template-preview-image"
                />
              )
            )}
            {frame === "loading" && <p className="lw-preview-status" role="status">{t("world.gallery.loading")}</p>}
            {frame === "picture" && template.showcase && <p className="lw-preview-status">{t("world.gallery.pictureNote")}</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/** A page-sized frame scaled into the stage: a browser window, or a phone with a bezel. */
const Device = ({ viewport, width, height, children }: { viewport: Viewport; width: number; height: number; children: ReactNode }) => {
  const page = PAGE[viewport];
  if (viewport === "desktop") {
    const scale = width > 0 ? Math.min(1, width / page.width) : 1;
    const frameHeight = height > 0 ? Math.max(page.height * 0.5, height / scale) : page.height;
    return (
      <div className="lw-device lw-device-desktop" style={{ width: page.width * scale, height: frameHeight * scale }}>
        <div className="lw-device-page" style={{ width: page.width, height: frameHeight, transform: `scale(${scale})` }}>{children}</div>
      </div>
    );
  }
  const outer = { width: page.width + PHONE_BEZEL * 2, height: page.height + PHONE_BEZEL * 2 };
  const scale = fitScale(width - 8, height - 8, outer.width, outer.height);
  return (
    <div className="lw-device lw-device-phone" style={{ width: outer.width * scale, height: outer.height * scale }}>
      <div className="lw-device-shell" style={{ width: outer.width, height: outer.height, padding: PHONE_BEZEL, transform: `scale(${scale})` }}>
        <div className="lw-device-page" style={{ width: page.width, height: page.height }}>{children}</div>
      </div>
    </div>
  );
};

/** The stage's inner size. A callback ref, because the dialog mounts its content after the first effect. */
function useStageSize() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([item]) => {
      const box = item.contentRect;
      setSize({ width: Math.floor(box.width), height: Math.floor(box.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { ref: setElement, ...size };
}

export default TemplatePreview;
