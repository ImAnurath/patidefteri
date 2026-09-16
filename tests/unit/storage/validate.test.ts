import { describe, it, expect } from 'vitest';
import { sniffMime, validateUpload } from '@/lib/storage/validate';
describe('validateUpload', () => {
  it('accepts a pdf receipt', () => expect(validateUpload({ type: 'application/pdf', size: 1000, name: 'd.pdf' }, 'receipt')).toEqual({ ok: true, ext: 'pdf' }));
  it('accepts a jpeg invoice', () => expect(validateUpload({ type: 'image/jpeg', size: 1000, name: 'x.jpg' }, 'invoice')).toEqual({ ok: true, ext: 'jpg' }));
  it('rejects a pdf photo', () => expect(validateUpload({ type: 'application/pdf', size: 1, name: 'x.pdf' }, 'photo').ok).toBe(false));
  it('rejects oversize', () => expect(validateUpload({ type: 'application/pdf', size: 11 * 1024 * 1024, name: 'x.pdf' }, 'receipt').ok).toBe(false));
  it('rejects unknown mime', () => expect(validateUpload({ type: 'text/html', size: 1, name: 'x.html' }, 'document').ok).toBe(false));
});

describe('sniffMime', () => {
  it('detects a pdf', () => expect(sniffMime(Buffer.from('%PDF-1.7\n1 0 obj'))).toBe('application/pdf'));
  it('detects a png', () => expect(sniffMime(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))).toBe('image/png'));
  it('detects a jpeg', () => expect(sniffMime(Buffer.from('ffd8ffe000104a46494600', 'hex'))).toBe('image/jpeg'));
  it('detects a webp', () => expect(sniffMime(Buffer.concat([Buffer.from('RIFF'), Buffer.from('1a000000', 'hex'), Buffer.from('WEBPVP8 ')]))).toBe('image/webp'));
  it('rejects junk bytes', () => expect(sniffMime(Buffer.from('merhaba, bu bir dosya degil'))).toBeNull());
  it('rejects a truncated png header', () => expect(sniffMime(Buffer.from('89504e47', 'hex'))).toBeNull());
});
