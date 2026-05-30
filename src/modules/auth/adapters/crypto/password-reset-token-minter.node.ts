/**
 * Adapter real de PasswordResetTokenMinter (modulo auth) - node:crypto. Espelha o refresh minter.
 * `token` = base64url(randomBytes(32)) (256 bits); `tokenHash` = sha256(token) hex. ASCII puro.
 */

import { randomBytes, createHash } from 'node:crypto';
import type { PasswordResetTokenMinter } from '../../application/ports/password-reset-token-minter.ts';

const sha256Hex = (raw: string): string => createHash('sha256').update(raw).digest('hex');

export const makeNodePasswordResetTokenMinter = (): PasswordResetTokenMinter => ({
  mint: () => {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: sha256Hex(token) };
  },
  hash: sha256Hex,
});
