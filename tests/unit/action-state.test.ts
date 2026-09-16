import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { fail } from '@/lib/action-state';
import { LedgerError } from '@/lib/ledger';

const zodError = () => z.object({ tr: z.string().min(1, 'Başlık gerekli') }).safeParse({ tr: '' }).error!;

describe('fail', () => {
  it('uses the first Zod issue message', () => {
    expect(fail(zodError())).toEqual({ error: 'Başlık gerekli' });
  });

  it('passes a LedgerError message through', () => {
    expect(fail(new LedgerError('PERIOD_CLOSED', 'Dönem kapalı'))).toEqual({ error: 'Dönem kapalı' });
  });

  it('maps a unique violation on the wrapped driver error', () => {
    const e = new Error('x', { cause: Object.assign(new Error('dup'), { code: '23505' }) });
    expect(fail(e)).toEqual({ error: 'Bu kayıt zaten var.' });
  });

  it('hides any other error and logs it', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    expect(fail(boom)).toEqual({ error: 'İşlem başarısız oldu.' });
    expect(fail('kaboom')).toEqual({ error: 'İşlem başarısız oldu.' });
    expect(spy.mock.calls).toEqual([[boom], ['kaboom']]);
    spy.mockRestore();
  });

  it('hides a driver error with another SQLSTATE', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new Error('Failed query: insert into "campaign_periods" ...', { cause: Object.assign(new Error('bad uuid'), { code: '22P02' }) });
    expect(fail(e)).toEqual({ error: 'İşlem başarısız oldu.' });
    spy.mockRestore();
  });
});
