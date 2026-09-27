/** Headless contracts for immutable public content. */
export interface ContentBlock {
  type: string; level?: number; html?: string; text?: string;
  items?: string[]; ordered?: boolean; src?: string; alt?: string;
}
export interface GalleryMedia {
  mediaType: "image" | "video"; image?: string; altText: string; caption: string;
  credit?: string; width?: number; height?: number; focalX: number; focalY: number;
  videoProvider?: string; videoId?: string; poster?: string; thumbnail?: string;
}
export interface ContentEntry {
  route: string; locale: string; releaseHash: string; templateCompatVersion: string;
  title?: string; excerpt?: string; summary?: string; author?: string; category?: string;
  hero?: string; cover?: string; publishedAt: string;
}
export interface ContentDetail extends ContentEntry {
  projection: { title: string; excerpt?: string; summary?: string; author?: string;
    blocks?: ContentBlock[]; items?: GalleryMedia[] };
  seo: { title?: string; description?: string };
}
export interface ContentState {
  kind: "blog" | "gallery"; detail: boolean; loading: boolean; unavailable: boolean;
  entries: ContentEntry[]; release: ContentDetail | null; page: number; hasNext: boolean;
}
export interface RichNode { tag?: string; text?: string; href?: string; src?: string; alt?: string; children?: RichNode[] }
const TAGS = new Set(["strong", "em", "b", "i", "u", "a", "br", "code", "p", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "img"]);
export function safeContentLink(value?: string): string | undefined {
  if (!value || hasUnsafeCharacters(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^(https?:|mailto:|tel:)/i.test(value) ? value : undefined;
}
export function safeContentMedia(value?: string): string | undefined {
  if (!value || value.includes("..") || hasUnsafeCharacters(value)) return undefined;
  return value.startsWith("/files/") || value.startsWith("/assets/appointment/") ? value : undefined;
}
export function richNodes(html = ""): RichNode[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const convert = (node: Node): RichNode[] => {
    if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || "" }];
    if (!(node instanceof Element) || !TAGS.has(node.localName)) return [];
    return [{ tag: node.localName, href: safeContentLink(node.getAttribute("href") || undefined),
      src: safeContentMedia(node.getAttribute("src") || undefined), alt: node.getAttribute("alt") || "",
      children: Array.from(node.childNodes).flatMap(convert) }];
  };
  return Array.from(document.body.childNodes).flatMap(convert);
}
export function videoLink(item: GalleryMedia): string | undefined {
  if (item.videoProvider === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(item.videoId || "")) return `https://www.youtube.com/watch?v=${item.videoId}`;
  if (item.videoProvider === "vimeo" && /^\d+$/.test(item.videoId || "")) return `https://vimeo.com/${item.videoId}`;
  return undefined;
}

function hasUnsafeCharacters(value: string): boolean {
  return value.includes("\\") || Array.from(value).some((character) => character.charCodeAt(0) <= 32);
}
