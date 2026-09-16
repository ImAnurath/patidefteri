import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/lib/markdown';
describe('renderMarkdown', () => {
  it('paragraphs and inline', () => expect(renderMarkdown('Merhaba **dünya** ve *sen*')).toBe('<p>Merhaba <strong>dünya</strong> ve <em>sen</em></p>'));
  it('headings and lists', () => expect(renderMarkdown('## Başlık\n\n- a\n- b')).toBe('<h2>Başlık</h2><ul><li>a</li><li>b</li></ul>'));
  it('links', () => expect(renderMarkdown('[site](https://x.y)')).toBe('<p><a href="https://x.y" rel="noopener">site</a></p>'));
  it('escapes html', () => expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'));
  it('rejects javascript links', () => expect(renderMarkdown('[x](javascript:alert(1))')).toBe('<p>x</p>'));
  it('rejects protocol-relative links', () => expect(renderMarkdown('[x](//evil.com)')).toBe('<p>x</p>'));
  it('leaves emphasis markers inside an href alone', () => expect(renderMarkdown('[a](https://x.y/*b*)')).toBe('<p><a href="https://x.y/*b*" rel="noopener">a</a></p>'));
});
