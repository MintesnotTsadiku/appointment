import { createElement, useRef, type ReactNode } from "react";

import type { ContentTemplateProps } from "../types";
import { usePublicChrome } from "../chrome";
import { useTemplateCredit } from "../credit";
import { brandLogo } from "../content";
import { richNodes, safeContentMedia, videoLink, type ContentBlock, type RichNode } from "../../contentContract";
import { Icon } from "./icons";
import { ErgataNewsletter } from "./ErgataNewsletter";
import "./ergata.css";

/** Journal and gallery pages in the Ergata frame: same bar, same quiet cards, same footer credit. */
export function ErgataContent({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode, content, contentRoot }: ContentTemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const logo = brandLogo(snapshot.compiledDesign);
  const release = content.release;
  const projection = release?.projection;
  const cover = projection?.items?.find((item) => item.image === (release?.hero || release?.cover));
  const listName = content.kind === "blog" ? chrome.t("journal") : chrome.t("gallery");
  const heading = projection?.title || listName;
  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-content-template="ergata"
    className="eg eg-content" data-template="ergata-therapy-v1" lang={locale} style={rootStyle}>
    <a className="eg-skip" href="#published-content">{chrome.t("skip")}</a>
    <header className="eg-bar">
      <div className="eg-wrap eg-bar-inner">
        <a className="eg-brand" href={publicRoot}>{logo ? <img src={logo} alt="" width={40} height={40} /> : <span className="eg-brand-mark" aria-hidden="true" />}<span>{applicationName}</span></a>
        <nav aria-label={chrome.t("navLabel")} className="eg-nav"><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></nav>
        <button type="button" className="eg-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><Icon name={mode === "dark" ? "sun" : "moon"} /><span>{chrome.modeName(mode)}</span></button>
      </div>
    </header>
    <main id="published-content" tabIndex={-1} className="eg-wrap">
      {content.loading ? <p role="status">Loading published content…</p> : <>
        <section className="eg-content-heading"><h1>{heading}</h1>{projection?.excerpt || projection?.summary ? <p>{projection.excerpt || projection.summary}</p> : null}</section>
        {content.unavailable ? <section className="eg-content-state"><h2>Content unavailable</h2><p>This content may have been withdrawn or is not available in this language.</p><a href={contentRoot}>{listName}</a></section> : content.detail && release ? <>
          {safeContentMedia(release.hero || release.cover) ? <img className="eg-content-cover" src={safeContentMedia(release.hero || release.cover)} alt="" width={cover?.width} height={cover?.height} /> : null}
          {content.kind === "blog" ? <article className="eg-content-article">
            <p className="eg-content-meta">{projection?.author}{release.publishedAt ? <> · <time dateTime={release.publishedAt}>{release.publishedAt.slice(0, 10)}</time></> : null}</p>
            {projection?.blocks?.map((block, index) => <div key={index}>{renderBlock(block)}</div>)}
          </article> : <div className="eg-content-media">{projection?.items?.map((item, index) => <figure key={index}>
            {item.mediaType === "image" && safeContentMedia(item.image) ? <img loading="lazy" decoding="async" src={safeContentMedia(item.image)} alt={item.altText} width={item.width} height={item.height} style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} /> : <>{safeContentMedia(item.poster || item.thumbnail) ? <img loading="lazy" src={safeContentMedia(item.poster || item.thumbnail)} alt={item.altText} /> : null}{videoLink(item) ? <a href={videoLink(item)} target="_blank" rel="noopener noreferrer">Watch video on {item.videoProvider} (opens a new tab)</a> : <p>Video unavailable</p>}</>}
            <figcaption>{item.caption}{item.credit ? <small>{item.credit}</small> : null}</figcaption>
          </figure>)}</div>}
          <a className="eg-content-back" href={contentRoot}>{listName}</a>
        </> : content.entries.length ? <>
          <div className="eg-content-grid">{content.entries.map((entry) => <article key={entry.releaseHash}>
            <a href={`${publicRoot}${entry.route}`}>{safeContentMedia(entry.hero || entry.cover) ? <img loading="lazy" decoding="async" src={safeContentMedia(entry.hero || entry.cover)} alt="" /> : null}<h2>{entry.title}</h2></a>
            <p>{entry.excerpt || entry.summary}</p><small>{entry.category || entry.author || entry.publishedAt.slice(0, 10)}</small>
          </article>)}</div>
          <nav className="eg-content-pagination" aria-label={listName}>{content.page > 1 ? <a href={`${contentRoot}?page=${content.page - 1}`}>Previous page</a> : <span />}{content.hasNext ? <a href={`${contentRoot}?page=${content.page + 1}`}>Next page</a> : null}</nav>
        </> : <section className="eg-content-state"><h2>Nothing published here yet</h2><p>Check back soon.</p><a href={publicRoot}>{chrome.t("backToSite")}</a></section>}
        <ErgataNewsletter snapshot={snapshot} applicationName={applicationName} locale={snapshot.locale} publicRoot={publicRoot} />
      </>}
    </main>
    {!content.loading ? <footer className="eg-footer"><div className="eg-wrap eg-footer-grid">
      <div className="eg-footer-brand"><a className="eg-brand" href={publicRoot}><span>{applicationName}</span></a></div>
      <nav aria-label={chrome.t("navLabel")} className="eg-footer-nav"><a href={publicRoot}>{chrome.t("backToSite")}</a><a href={`${publicRoot}/book`}>{chrome.t("bookThis")}</a></nav>
      <div className="eg-legal"><small>© {new Date().getFullYear()} {applicationName}</small>{credit ? <p className="eg-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}</div>
    </div></footer> : null}
  </div>;
}

function renderNodes(nodes: RichNode[]): ReactNode {
  return nodes.map((node, index) => node.tag ? createElement(node.tag, { key: index, href: node.href, src: node.src, alt: node.tag === "img" ? node.alt : undefined, loading: node.tag === "img" ? "lazy" : undefined }, ["br", "img"].includes(node.tag) ? undefined : renderNodes(node.children || [])) : node.text);
}

function renderBlock(block: ContentBlock): ReactNode {
  const inline = () => renderNodes(richNodes(block.html));
  switch (block.type) {
    case "heading": return createElement(`h${Math.max(2, Math.min(6, block.level || 2))}`, {}, inline());
    case "paragraph": return <p>{inline()}</p>;
    case "quote": return <blockquote>{inline()}</blockquote>;
    case "code": return <pre><code>{block.text}</code></pre>;
    case "divider": return <hr />;
    case "image": return safeContentMedia(block.src) ? <img loading="lazy" src={safeContentMedia(block.src)} alt={block.alt || ""} /> : null;
    case "list": return createElement(block.ordered ? "ol" : "ul", {}, block.items?.map((item, index) => <li key={index}>{renderNodes(richNodes(item))}</li>));
    case "figure": case "table": return inline();
    default: return null;
  }
}
