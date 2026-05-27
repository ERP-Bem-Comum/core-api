/**
 * Suite de contrato compartilhada para TokenIssuer (modulo auth).
 * Comum a fake e ES256 (jose). NAO executa direto. Setup sync-ou-async. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { TokenIssuer } from '#src/modules/auth/application/ports/token-issuer.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

export interface TokenIssuerFactory {
  make: () => TokenIssuer | Promise<TokenIssuer>;
}

export const runTokenIssuerContract = (label: string, factory: TokenIssuerFactory): void => {
  describe(`TokenIssuer contract — ${label}`, () => {
    it('CA1: issueAccessToken produz string nao-vazia', async () => {
      const issuer = await factory.make();
      const r = await issuer.issueAccessToken({ userId: UserId.generate() });
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value.length > 0, true);
    });

    it('CA2: verify do token emitido devolve o mesmo userId', async () => {
      const issuer = await factory.make();
      const userId = UserId.generate();
      const issued = await issuer.issueAccessToken({ userId });
      assert.equal(issued.ok, true);
      if (!issued.ok) return;
      const v = await issuer.verifyAccessToken(issued.value);
      assert.equal(v.ok, true);
      if (v.ok) assert.equal(v.value.userId, userId);
    });

    it('CA3: verify de token invalido retorna err', async () => {
      const issuer = await factory.make();
      const v = await issuer.verifyAccessToken('garbage.token.value');
      assert.equal(v.ok, false);
    });
  });
};
