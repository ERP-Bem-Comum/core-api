/**
 * Adapter real de CollaboratorInviteTokenMinter (módulo partners, #43) — node:crypto.
 * Espelha o `password-reset-token-minter.node.ts` do auth (DUPLICADO — ADR-0006).
 * `token` = base64url(randomBytes(32)) (256 bits); `tokenHash` = sha256(token) hex. ASCII puro.
 */

import { randomBytes, createHash } from 'node:crypto';
import type { CollaboratorInviteTokenMinter } from '#src/modules/partners/application/ports/collaborator-invite-token-minter.ts';

const sha256Hex = (raw: string): string => createHash('sha256').update(raw).digest('hex');

export const makeNodeCollaboratorInviteTokenMinter = (): CollaboratorInviteTokenMinter => ({
  mint: () => {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: sha256Hex(token) };
  },
  hash: sha256Hex,
});
