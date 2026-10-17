import { createElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ContentTemplateProps } from "../types";
import {
  richNodes,
  safeContentMedia,
  videoLink,
  type RichNode,
  type ContentBlock,
} from "../../contentContract";
import { usePublicChrome } from "../chrome";
import { Header, Footer } from "./Template";

function rich(nodes: RichNode[]): ReactNode {
  return nodes.map((node, index) => {
    if (!node.tag) return node.text;
    if (node.tag === "br") return <br key={index} />;
    if (node.tag === "img")
      return node.src ? (
        <img key={index} src={node.src} alt={node.alt || ""} loading="lazy" />
      ) : null;
    return createElement(
      node.tag,
      {
        key: index,
        ...(node.tag === "a"
          ? { href: node.href, rel: "noopener noreferrer" }
          : {}),
      },
      rich(node.children || []),
    );
  });
}
function Block({ block }: { block: ContentBlock }) {
  if (block.type === "image")
    return safeContentMedia(block.src) ? (
      <img
        src={safeContentMedia(block.src)}
        alt={block.alt || ""}
        loading="lazy"
      />
    ) : null;
  if (block.type === "list")
    return createElement(
      block.ordered ? "ol" : "ul",
      {},
      (block.items || []).map((item, index) => (
        <li key={index}>{rich(richNodes(item))}</li>
      )),
    );
  if (block.type === "heading")
    return createElement(
      `h${Math.min(6, Math.max(2, block.level || 2))}`,
      {},
      block.text || rich(richNodes(block.html)),
    );
  return (
    <div>{block.html ? rich(richNodes(block.html)) : <p>{block.text}</p>}</div>
  );
}
export function Content(props: ContentTemplateProps) {
  const chrome = usePublicChrome(props.locale);
  const { content } = props;
  const projection = content.release?.projection;
  const link = (path: string) =>
    `${path}${props.locale === "am" ? "?locale=am" : ""}`;
  return (
    <div
      className="hana3"
      data-pe-root
      data-pe-mode={props.mode}
      data-template="hana-conversations-v3"
      style={props.rootStyle}
      lang={props.locale}
    >
      <Header props={props} />
      <main className="hana3-content">
        <Link className="hana3-text-link" to={link(props.publicRoot)}>
          {chrome.t("backToSite")}
        </Link>
        <h1>
          {projection?.title ||
            chrome.t(content.kind === "gallery" ? "gallery" : "journal")}
        </h1>
        {content.loading ? (
          <p role="status">{chrome.t("loadingSite")}</p>
        ) : null}
        {content.unavailable ? <p>{chrome.t("contentUnavailable")}</p> : null}
        {projection ? (
          <>
            <p>{projection.excerpt || projection.summary}</p>
            {safeContentMedia(content.release?.hero) ? (
              <img src={safeContentMedia(content.release?.hero)} alt="" />
            ) : null}
            {projection.blocks?.map((block, index) => (
              <Block key={index} block={block} />
            ))}
            <div className="hana3-entries">
              {projection.items?.map((item, index) => (
                <figure key={index}>
                  {safeContentMedia(item.image || item.poster) ? (
                    <img
                      src={safeContentMedia(item.image || item.poster)}
                      alt={item.altText}
                      loading="lazy"
                    />
                  ) : null}
                  <figcaption>{item.caption}</figcaption>
                  {videoLink(item) ? (
                    <a href={videoLink(item)} rel="noopener noreferrer">
                      {chrome.t("watchVideo")}
                    </a>
                  ) : null}
                </figure>
              ))}
            </div>
          </>
        ) : (
          <div className="hana3-entries">
            {content.entries.map((entry) => (
              <article className="hana3-entry" key={entry.route}>
                <Link to={link(`${props.publicRoot}${entry.route}`)}>
                  {safeContentMedia(entry.cover || entry.hero) ? (
                    <img
                      src={safeContentMedia(entry.cover || entry.hero)}
                      alt=""
                      loading="lazy"
                    />
                  ) : null}
                  <h2>{entry.title}</h2>
                  <p>{entry.excerpt || entry.summary}</p>
                </Link>
              </article>
            ))}
          </div>
        )}
        {!content.detail ? (
          <nav aria-label={chrome.t("navLabel")}>
            {content.page > 1 ? (
              <Link
                className="hana3-text-link"
                to={`${props.contentRoot}?page=${content.page - 1}&locale=${props.locale}`}
              >
                {chrome.t("previous")}
              </Link>
            ) : null}
            {content.hasNext ? (
              <Link
                className="hana3-text-link"
                to={`${props.contentRoot}?page=${content.page + 1}&locale=${props.locale}`}
              >
                {chrome.t("next")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
      <Footer props={props} />
    </div>
  );
}
