import { createElement, type ReactNode } from "react";
import type { ContentTemplateProps } from "../types";
import { richNodes, safeContentMedia, videoLink, type RichNode, type ContentBlock } from "../../contentContract";
import "./meron.css";

export function MeronContent({ snapshot, applicationName, publicRoot, rootStyle, mode, toggleMode, content, contentRoot }: ContentTemplateProps) {
  const release = content.release;
  const projection = release?.projection;
  const heading = projection?.title || (content.kind === "blog" ? "Atelier notes" : "Selected works");
  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-content-template="meron" className="meron-site meron-content" style={rootStyle}>
    <a className="meron-content-skip" href="#published-content">Skip to content</a>
    <header className="meron-content-nav">
      <a href={publicRoot}><strong>{applicationName}</strong></a>
      <nav aria-label="Public site"><a href={publicRoot}>Home</a><a href={`${publicRoot}/blog`}>Journal</a><a href={`${publicRoot}/gallery`}>Gallery</a><a href={`${publicRoot}/book`}>Book an appointment</a></nav>
      <button type="button" onClick={toggleMode} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>{mode === "dark" ? "Light" : "Dark"}</button>
    </header>
    <main id="published-content" tabIndex={-1}>
      <section className="meron-content-heading"><p>THE JOURNAL / The details tell the story.</p><h1>{heading}</h1>{projection?.excerpt || projection?.summary ? <p>{projection.excerpt || projection.summary}</p> : null}</section>
      {content.loading ? <p role="status">Loading published content…</p> : content.unavailable ? <section className="meron-content-state"><h2>Content unavailable</h2><p>This content may have been withdrawn or is not available in this language.</p><a href={contentRoot}>Return to {content.kind === "blog" ? "journal" : "gallery"}</a></section> : content.detail && release ? <>
        {safeContentMedia(release.hero || release.cover) ? <img className="meron-content-cover" src={safeContentMedia(release.hero || release.cover)} alt="" /> : null}
        {content.kind === "blog" ? <article className="meron-content-article"><p>{projection?.author}{release.publishedAt ? <time dateTime={release.publishedAt}>{release.publishedAt.slice(0, 10)}</time> : null}</p>{projection?.blocks?.map((block, index) => <div key={index}>{renderBlock(block)}</div>)}</article> : <div className="meron-content-media">{projection?.items?.map((item, index) => <figure key={index}>
          {item.mediaType === "image" && safeContentMedia(item.image) ? <img loading="lazy" decoding="async" src={safeContentMedia(item.image)} alt={item.altText} width={item.width} height={item.height} style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} /> : <>{safeContentMedia(item.poster || item.thumbnail) ? <img loading="lazy" src={safeContentMedia(item.poster || item.thumbnail)} alt={item.altText} /> : null}{videoLink(item) ? <a href={videoLink(item)} target="_blank" rel="noopener noreferrer">Watch video on {item.videoProvider} (opens a new tab)</a> : <p>Video unavailable</p>}</>}
          <figcaption>{item.caption}{item.credit ? <small>{item.credit}</small> : null}</figcaption>
        </figure>)}</div>}
        <a href={contentRoot}>Back to {content.kind === "blog" ? "journal" : "gallery"}</a>
      </> : content.entries.length ? <>
        <div className="meron-content-grid">{content.entries.map((entry) => <article key={entry.releaseHash}>
          <a href={`${publicRoot}${entry.route}`} aria-label={entry.title}>{safeContentMedia(entry.hero || entry.cover) ? <img loading="lazy" decoding="async" src={safeContentMedia(entry.hero || entry.cover)} alt="" /> : null}<h2>{entry.title}</h2></a>
          <p>{entry.excerpt || entry.summary}</p><small>{entry.category || entry.author || entry.publishedAt.slice(0, 10)}</small>
        </article>)}</div>
        <nav className="meron-content-pagination" aria-label="Content pages">{content.page > 1 ? <a href={`${contentRoot}?page=${content.page - 1}`}>Previous page</a> : null}{content.hasNext ? <a href={`${contentRoot}?page=${content.page + 1}`}>Next page</a> : null}</nav>
      </> : <section className="meron-content-state"><h2>{content.kind === "blog" ? "Stories are on their way" : "New moments coming soon"}</h2><p>Check back for our next update.</p><a href={`${publicRoot}/book`}>Book an appointment</a></section>}
      <aside className="meron-content-signup" aria-labelledby="newsletter-title"><h2 id="newsletter-title">Keep in touch with {applicationName}</h2><p>Newsletter signup is not available yet. Please check back soon.</p></aside>
    </main>
    <footer className="meron-content-footer"><a href={publicRoot}>{applicationName}</a><a href={`${publicRoot}/book`}>Plan your visit →</a></footer>
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
