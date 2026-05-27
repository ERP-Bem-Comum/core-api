/**
 * Adapter ES256 de TokenIssuer (modulo auth) - via jose (DD-TOKEN-01).
 *
 * core-api assina com a chave PRIVADA; o BFF valida com a PUBLICA. `alg: 'ES256'` fixo na assinatura
 * E na verificacao (algorithms: ['ES256']) — evita algorithm-confusion. `iss` validado. Chaves injetadas.
 * `try/catch -> Result` na borda. ASCII puro.
 */

import type { webcrypto } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { ok, err } from '../../../../shared/primitives/result.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import type { TokenIssuer } from '../../application/ports/token-issuer.ts';

export type Es256Config = Readonly<{
  privateKey: webcrypto.CryptoKey;
  publicKey: webcrypto.CryptoKey;
  issuer: string;
  ttlSeconds: number;
}>;

const isExpired = (e: unknown): boolean =>
  e instanceof Error && (e as { code?: string }).code === 'ERR_JWT_EXPIRED';

// `CryptoKey` (Web Crypto) e tipo externo da plataforma — nao e deeply-readonly por declaracao.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const makeEs256TokenIssuer = (config: Es256Config): TokenIssuer => ({
  issueAccessToken: async ({ userId }) => {
    try {
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject(userId)
        .setIssuedAt()
        .setIssuer(config.issuer)
        .setExpirationTime(`${config.ttlSeconds}s`)
        .sign(config.privateKey);
      return ok(token);
    } catch {
      return err('token-issue-failed');
    }
  },
  verifyAccessToken: async (token) => {
    try {
      const { payload } = await jwtVerify(token, config.publicKey, {
        issuer: config.issuer,
        algorithms: ['ES256'],
      });
      if (typeof payload.sub !== 'string') return err('token-invalid');
      const id = UserId.rehydrate(payload.sub);
      return id.ok ? ok({ userId: id.value }) : err('token-invalid');
    } catch (e) {
      return err(isExpired(e) ? 'token-expired' : 'token-invalid');
    }
  },
});
