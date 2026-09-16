import { describe, it, expect } from 'vitest';
import { validateUpload } from '@/lib/storage/validate';
describe('validateUpload', () => {
  it('accepts a pdf receipt', () => expect(validateUpload({ type: 'application/pdf', size: 1000, name: 'd.pdf' }, 'receipt')).toEqual({ ok: true, ext: 'pdf' }));
  it('accepts a jpeg invoice', () => expect(validateUpload({ type: 'image/jpeg', size: 1000, name: 'x.jpg' }, 'invoice')).toEqual({ ok: true, ext: 'jpg' }));
  it('rejects a pdf photo', () => expect(validateUpload({ type: 'application/pdf', size: 1, name: 'x.pdf' }, 'photo').ok).toBe(false));
  it('rejects oversize', () => expect(validateUpload({ type: 'application/pdf', size: 11 * 1024 * 1024, name: 'x.pdf' }, 'receipt').ok).toBe(false));
  it('rejects unknown mime', () => expect(validateUpload({ type: 'text/html', size: 1, name: 'x.html' }, 'document').ok).toBe(false));
});
