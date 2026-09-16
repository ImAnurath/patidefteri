const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  let out = esc(s);
  // The href may hold balanced parentheses, so the whole `(...)` is consumed even when the link is
  // dropped for being unsafe — otherwise `[x](javascript:alert(1))` would leave a stray `)` behind.
  out = out.replace(/\[([^\]]+)\]\(([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)\)/g, (_m, text: string, href: string) =>
    /^(https?:\/\/|\/|mailto:)/i.test(href) ? `<a href="${href}" rel="noopener">${text}</a>` : text);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
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
