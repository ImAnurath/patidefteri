import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
describe('password', () => {
  it('round-trips', async () => {
    const h = await hashPassword('correct horse');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(h, 'correct horse')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
  });
});
