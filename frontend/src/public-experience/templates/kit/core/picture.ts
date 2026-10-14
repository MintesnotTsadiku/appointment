/**
 * Responsive `<picture>` sources from an imagery asset (`appointment-imagery.v1`). Pure: each template
 * renders its own `<picture>` from the result.
 *
 * - Art direction: `mobileSrc` (with `mobileWidth`/`mobileHeight`) below `mobileQuery`.
 * - Night: `darkSrc`/`darkMobileSrc` when `night` is true.
 * - Formats: `formats: ["avif"]` adds an AVIF source next to every WebP file (`.webp` becomes `.avif`).
 * - Widths: `widths` lists smaller desktop files named `<name>-w<width>.webp`.
 * Owner photos (`/files/…`) have none of these and give a plain image.
 */
export interface PictureAsset {
  src: string;
  alt?: string;
  mobileSrc?: string;
  width?: number;
  height?: number;
  mobileWidth?: number;
  mobileHeight?: number;
  darkSrc?: string;
  darkMobileSrc?: string;
  formats?: string[];
  widths?: number[];
}

export interface PictureSource {
  srcSet: string;
  type: "image/avif" | "image/webp";
  media?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

export interface PictureSet {
  sources: PictureSource[];
  img: { src: string; srcSet?: string; sizes?: string; width?: number; height?: number };
}

export const MOBILE_QUERY = "(max-width: 640px)";

const WEBP = /\.webp$/i;

function variant(src: string, width: number): string {
  return src.replace(WEBP, `-w${width}.webp`);
}

function avif(srcSet: string): string {
  return srcSet.replace(/\.webp(?=\s|$|,)/gi, ".avif");
}

/** `srcset` of a desktop file and its smaller widths ("a-w640.webp 640w, a.webp 1600w"). */
export function widthSet(src: string, width: number | undefined, widths: number[] = []): string {
  if (!width || !WEBP.test(src)) return src;
  return [...widths.filter((value) => value < width).map((value) => `${variant(src, value)} ${value}w`), `${src} ${width}w`].join(", ");
}

export function pictureSet(asset: PictureAsset, options: { night?: boolean; sizes?: string; mobileQuery?: string } = {}): PictureSet {
  const night = Boolean(options.night && asset.darkSrc);
  const desktop = night ? asset.darkSrc! : asset.src;
  const mobile = night ? asset.darkMobileSrc : asset.mobileSrc && asset.mobileSrc !== asset.src ? asset.mobileSrc : undefined;
  const hasAvif = (asset.formats || []).includes("avif") && WEBP.test(desktop);
  const desktopSet = widthSet(desktop, asset.width, asset.widths);
  const sizes = desktopSet.includes(" ") ? options.sizes || "100vw" : undefined;
  const sources: PictureSource[] = [];
  if (mobile) {
    const media = options.mobileQuery || MOBILE_QUERY;
    const box = asset.mobileWidth && asset.mobileHeight ? { width: asset.mobileWidth, height: asset.mobileHeight } : {};
    if (hasAvif) sources.push({ srcSet: avif(mobile), type: "image/avif", media, ...box });
    sources.push({ srcSet: mobile, type: "image/webp", media, ...box });
  }
  if (hasAvif) sources.push({ srcSet: avif(desktopSet), type: "image/avif", ...(sizes ? { sizes } : {}) });
  return {
    sources,
    img: {
      src: desktop,
      ...(desktopSet !== desktop ? { srcSet: desktopSet } : {}),
      ...(sizes ? { sizes } : {}),
      ...(asset.width && asset.height ? { width: asset.width, height: asset.height } : {}),
    },
  };
}

/**
 * Loading attributes for an image. The LCP image gets `fetchpriority="high"` as a lowercase DOM
 * attribute (React 18 does not know the camel-case prop), everything else loads lazily.
 */
export function loadingAttributes(eager: boolean): Record<string, string> {
  return eager ? { loading: "eager", decoding: "async", fetchpriority: "high" } : { loading: "lazy", decoding: "async" };
}
