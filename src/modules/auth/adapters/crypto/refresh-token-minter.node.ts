/**
 * Adapter real de RefreshTokenMinter (modulo auth) - node:crypto.
 *
 * `token` = base64url(randomBytes(32)) (256 bits de entropia); `tokenHash` = sha256(token) hex.
 * ASCII puro.
 */

import { randomBytes, createHash } from 'node:crypto';
import type { RefreshTokenMinter } from '../../application/ports/refresh-token-minter.ts';

export const makeNodeRefreshTokenMinter = (): RefreshTokenMinter => ({
  mint: () => {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  },
});
