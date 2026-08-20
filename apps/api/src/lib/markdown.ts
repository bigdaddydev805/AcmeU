import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote',
    'ul', 'ol', 'li',
    'strong', 'em', 'del', 'sup', 'sub',
    'a', 'img', 'figure', 'figcaption',
    'code', 'pre', 'kbd', 'samp',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'details', 'summary', 'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'title', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
    iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'title'],
    code: ['class'],
    pre: ['class'],
    span: ['class'],
    div: ['class'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: ['player.vimeo.com', 'www.youtube-nocookie.com', 'cdn.acmeu.com'],
  allowProtocolRelative: false,
};

const ENTITY_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&',
};

function restoreSourceEntities(html: string): string {
  return html.replace(
    /<code([^>]*)>([\s\S]*?)<\/code>/g,
    (_match, attrs: string, inner: string) =>
      `<code${attrs}>${inner.replace(/&(lt|gt|quot|#39|amp);/g, (e) => ENTITY_MAP[e] ?? e)}</code>`,
  );
}

export function renderMarkdown(source: string): string {
  if (!source) return '';
  const raw = marked.parse(source) as string;
  const cleaned = sanitizeHtml(raw, SANITIZE_OPTIONS);
  return restoreSourceEntities(cleaned);
}

export function excerpt(source: string, length = 200): string {
  const text = sanitizeHtml(marked.parse(source || '') as string, { allowedTags: [] })
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
