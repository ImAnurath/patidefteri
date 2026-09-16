const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Absolute http(s), root-relative (never protocol-relative `//host`) and mailto links only. */
const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|mailto:)/i;

// The href may hold balanced parentheses, so the whole `(...)` is consumed even when the link is
// dropped for being unsafe — otherwise `[x](javascript:alert(1))` would leave a stray `)` behind.
const LINK = /\[([^\]]+)\]\(([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)\)/g;

// `esc` has already turned every angle bracket in the input into an entity, so `<0>` cannot occur
// in escaped text and is free to stand in for a rendered link. Emphasis tags never match: `\d+`.
const PARKED = /<(\d+)>/g;

const emphasis = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');

function inline(s: string): string {
  // Links are rendered first and parked behind a placeholder, so the emphasis pass can never reach
  // inside a generated href: `[a](https://x.y/*b*)` has to keep its `*b*` verbatim.
  const parked: string[] = [];
  const withTokens = esc(s).replace(LINK, (_m, text: string, href: string) => {
    parked.push(SAFE_HREF.test(href) ? `<a href="${href}" rel="noopener">${emphasis(text)}</a>` : emphasis(text));
    return `<${parked.length - 1}>`;
  });
  return emphasis(withTokens).replace(PARKED, (_m, i: string) => parked[Number(i)]!);
}

export function renderMarkdown(md: string): string {
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const h = /^(#{1,3})\s+(.*)$/.exec(b);
    if (h) return `<h${h[1]!.length}>${inline(h[2]!)}</h${h[1]!.length}>`;
    const lines = b.split('\n');
    if (lines.every((l) => /^-\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}
