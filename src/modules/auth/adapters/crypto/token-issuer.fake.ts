/**
 * Adapter FAKE de TokenIssuer (modulo auth) - round-trip base64url do userId, SEM assinatura.
 *
 * Determinístico, zero dep, para testes/use cases. NAO e JWT real — nao usar em producao. ASCII puro.
 */

import { Buffer } from 'node:buffer';
import { ok, err } from '../../../../shared/primitives/result.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import type { TokenIssuer } from '../../application/ports/token-issuer.ts';

const PREFIX = 'fake-jwt.';

export const makeFakeTokenIssuer = (): TokenIssuer => ({
  issueAccessToken: async ({ userId }) =>
    ok(`${PREFIX}${Buffer.from(userId, 'utf8').toString('base64url')}`),
  verifyAccessToken: async (token) => {
    if (!token.startsWith(PREFIX)) return err('token-invalid');
    const raw = Buffer.from(token.slice(PREFIX.length), 'base64url').toString('utf8');
    const id = UserId.rehydrate(raw);
    return id.ok ? ok({ userId: id.value }) : err('token-invalid');
  },
});
