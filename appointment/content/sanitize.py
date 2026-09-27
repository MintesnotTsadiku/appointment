"""Strict, deterministic rich-text sanitation for public content.

Public projections reject scripts, event attributes, arbitrary styles, unsafe
URLs, frames and unknown embeds. Content is reparsed into a closed set of
structured blocks rather than trusted as HTML. The same input always produces
the same output so a canonical content hash is stable.
"""

from __future__ import annotations

import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

ALLOWED_TAGS = {
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "a",
    "br",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "figure",
    "figcaption",
}
VOID_TAGS = {"br", "hr", "img"}
DROP_CONTENT_TAGS = {
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "template",
    "svg",
    "math",
    "noscript",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "link",
    "meta",
    "base",
    "audio",
    "video",
    "source",
}
HEADING_TAGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}
ALLOWED_ATTRS = {
    "a": {"href", "title"},
    "img": {"src", "alt", "title", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}
URL_ATTRS = {"href": "link", "src": "media"}

_UNSAFE_SCHEMES = ("javascript:", "vbscript:", "file:", "data:", "blob:")
_PHONE_RE = re.compile(r"^[+]?[0-9 ()\-.]{4,}$")


class SanitizeError(Exception):
    pass


def safe_url(url: object, *, allow_relative: bool = True) -> str | None:
    """Return a safe URL string, or ``None`` when the value must be dropped."""

    if not isinstance(url, str):
        return None
    value = url.strip()
    if not value:
        return None
    lowered = value.lower()
    if lowered.startswith(_UNSAFE_SCHEMES):
        return None
    if value.startswith("#"):
        return None
    if value.startswith("//"):
        return None
    if allow_relative and value.startswith("/"):
        return value
    parsed = urlparse(value)
    if parsed.scheme in ("http", "https", "mailto", "tel"):
        return value
    return None


class _Node:
    __slots__ = ("tag", "attrs", "children")

    def __init__(self, tag, attrs):
        self.tag = tag
        self.attrs = attrs
        self.children: list = []


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _Node("#root", {})
        self.stack = [self.root]
        self._drop_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS:
            self._drop_depth += 1
            return
        if self._drop_depth:
            return
        if tag in VOID_TAGS:
            self.stack[-1].children.append(_Node(tag, self._clean_attrs(tag, attrs)))
            return
        if tag not in ALLOWED_TAGS:
            # Unknown container: keep its text children, drop the tag itself.
            self.stack.append(_Node(None, {}))
            return
        node = _Node(tag, self._clean_attrs(tag, attrs))
        self.stack[-1].children.append(node)
        self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS or self._drop_depth:
            return
        if tag in ALLOWED_TAGS:
            self.stack[-1].children.append(_Node(tag, self._clean_attrs(tag, attrs)))

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS:
            if self._drop_depth:
                self._drop_depth -= 1
            return
        if self._drop_depth:
            return
        for index in range(len(self.stack) - 1, 0, -1):
            node = self.stack[index]
            if node.tag == tag or node.tag is None:
                del self.stack[index:]
                return

    def handle_data(self, data):
        if self._drop_depth:
            return
        if data:
            self.stack[-1].children.append(data)

    def handle_comment(self, data):  # noqa: ARG002
        return

    def _clean_attrs(self, tag, attrs):
        allowed = ALLOWED_ATTRS.get(tag, set())
        cleaned = {}
        for name, value in attrs:
            name = name.lower()
            if name not in allowed:
                continue
            if name in URL_ATTRS:
                safe = safe_url(value)
                if not safe:
                    continue
                cleaned[name] = safe
            elif name in ("width", "height", "colspan", "rowspan"):
                if str(value).isdigit():
                    cleaned[name] = str(value)
            else:
                cleaned[name] = value
        return cleaned


def _render(node) -> str:
    if isinstance(node, str):
        return escape(node, quote=False)
    if node.tag is None:
        return "".join(_render(child) for child in node.children)
    if node.tag in VOID_TAGS:
        attrs = "".join(f' {name}="{escape(value, quote=True)}"' for name, value in node.attrs.items())
        return f"<{node.tag}{attrs}>"
    attrs = "".join(f' {name}="{escape(value, quote=True)}"' for name, value in node.attrs.items())
    inner = "".join(_render(child) for child in node.children)
    return f"<{node.tag}{attrs}>{inner}</{node.tag}>"


def _text(node) -> str:
    if isinstance(node, str):
        return node
    return "".join(_text(child) for child in node.children)


def _parse(raw: object) -> _Node:
    builder = _Builder()
    builder.feed(str(raw or ""))
    builder.close()
    return builder.root


def sanitize_html(raw: object) -> str:
    """Return a safe HTML string with only allowlisted tags and attributes."""

    return "".join(_render(child) for child in _parse(raw).children)


def _inline_children(node):
    return [child for child in node.children if not isinstance(child, str) or child.strip()]


def image_sources(raw: object) -> list[str]:
    """Collect sanitized image references at every rich-text nesting level."""
    pending = [_parse(raw)]
    sources = []
    while pending:
        node = pending.pop()
        if isinstance(node, str):
            continue
        source = node.attrs.get("src") if node.tag == "img" else None
        if source and source not in sources:
            sources.append(source)
        pending.extend(reversed(node.children))
    return sources


def html_to_blocks(raw: object) -> list[dict]:
    """Project sanitized HTML into a closed list of structured blocks."""

    root = _parse(raw)
    blocks: list[dict] = []

    def emit(node):
        tag = node.tag
        if tag is None:
            emit_children(node)
            return
        if tag in HEADING_TAGS:
            blocks.append(
                {"type": "heading", "level": HEADING_TAGS[tag], "html": _inline_html(node)}
            )
        elif tag == "p":
            blocks.append({"type": "paragraph", "html": _inline_html(node)})
        elif tag in ("ul", "ol"):
            items = [
                _inline_html(item)
                for item in node.children
                if not isinstance(item, str) and item.tag == "li"
            ]
            blocks.append({"type": "list", "ordered": tag == "ol", "items": items})
        elif tag == "blockquote":
            blocks.append({"type": "quote", "html": _inline_html(node)})
        elif tag == "pre":
            blocks.append({"type": "code", "text": _text(node)})
        elif tag == "table":
            blocks.append({"type": "table", "html": _render(node)})
        elif tag == "figure":
            blocks.append({"type": "figure", "html": _render(node)})
        elif tag == "img":
            src = node.attrs.get("src")
            if src:
                blocks.append({"type": "image", "src": src, "alt": node.attrs.get("alt") or ""})
        elif tag == "hr":
            blocks.append({"type": "divider"})
        else:
            for child in node.children:
                if not isinstance(child, str):
                    emit(child)
                elif child.strip():
                    blocks.append({"type": "paragraph", "html": escape(child.strip(), quote=False)})

    for child in root.children:
        if isinstance(child, str):
            text = child.strip()
            if text:
                blocks.append({"type": "paragraph", "html": escape(text, quote=False)})
        else:
            emit(child)
    return blocks


def _inline_html(node) -> str:
    return "".join(_render(child) for child in node.children)


def plain_text(blocks: list[dict]) -> str:
    parts: list[str] = []
    for block in blocks:
        if block.get("type") in ("paragraph", "heading", "quote", "figure", "table"):
            parts.append(re.sub(r"<[^>]+>", " ", block.get("html", "")))
        elif block.get("type") == "list":
            parts.extend(re.sub(r"<[^>]+>", " ", item) for item in block.get("items", []))
        elif block.get("type") == "code":
            parts.append(block.get("text", ""))
        elif block.get("type") == "image":
            parts.append(block.get("alt", ""))
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def excerpt(blocks: list[dict], limit: int = 200) -> str:
    text = plain_text(blocks)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "\u2026"


# --- Minimal, safe Markdown ------------------------------------------------

_MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)\s]+)\)")
_MD_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_MD_ITALIC_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
_MD_CODE_RE = re.compile(r"`([^`]+)`")


def _md_inline(text: str) -> str:
    placeholders: dict[str, str] = {}

    def stash(match):
        key = f"\x00{len(placeholders)}\x00"
        label = escape(match.group(1), quote=False)
        href = safe_url(match.group(2))
        placeholders[key] = (
            f'<a href="{escape(href, quote=True)}">{label}</a>' if href else label
        )
        return key

    value = _MD_LINK_RE.sub(stash, text)
    value = escape(value, quote=False)
    value = _MD_BOLD_RE.sub(r"<strong>\1</strong>", value)
    value = _MD_ITALIC_RE.sub(r"<em>\1</em>", value)
    value = _MD_CODE_RE.sub(r"<code>\1</code>", value)
    for key, html in placeholders.items():
        value = value.replace(key, html)
    return value


def markdown_to_html(text: object) -> str:
    """Convert a small, safe Markdown subset to HTML.

    Raw HTML in the source is escaped, never executed. Only headings, lists,
    blockquotes, fenced code, paragraphs and the inline emphasis/link forms are
    supported.
    """

    lines = str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out: list[str] = []
    paragraph: list[str] = []
    list_items: list[str] = []
    list_ordered = False
    in_code = False
    code_lines: list[str] = []

    def flush_paragraph():
        if paragraph:
            out.append("<p>" + _md_inline(" ".join(paragraph).strip()) + "</p>")
            paragraph.clear()

    def flush_list():
        nonlocal list_ordered
        if list_items:
            tag = "ol" if list_ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{item}</li>" for item in list_items) + f"</{tag}>")
            list_items.clear()

    for line in lines:
        if in_code:
            if line.strip().startswith("```"):
                out.append("<pre>" + escape("\n".join(code_lines)) + "</pre>")
                code_lines = []
                in_code = False
            else:
                code_lines.append(line)
            continue
        stripped = line.strip()
        if stripped.startswith("```"):
            flush_paragraph()
            flush_list()
            in_code = True
            continue
        if not stripped:
            flush_paragraph()
            flush_list()
            continue
        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            flush_paragraph()
            flush_list()
            level = len(heading.group(1))
            out.append(f"<h{level}>{_md_inline(heading.group(2))}</h{level}>")
            continue
        if stripped.startswith(">"):
            flush_paragraph()
            flush_list()
            out.append("<blockquote>" + _md_inline(stripped[1:].strip()) + "</blockquote>")
            continue
        unordered = re.match(r"^[-*+]\s+(.*)$", stripped)
        ordered = re.match(r"^\d+\.\s+(.*)$", stripped)
        if unordered or ordered:
            flush_paragraph()
            is_ordered = bool(ordered)
            if list_items and is_ordered != list_ordered:
                flush_list()
            list_ordered = is_ordered
            list_items.append(_md_inline((ordered or unordered).group(1)))
            continue
        flush_list()
        paragraph.append(stripped)

    if in_code:
        out.append("<pre>" + escape("\n".join(code_lines)) + "</pre>")
    flush_paragraph()
    flush_list()
    return "".join(out)
