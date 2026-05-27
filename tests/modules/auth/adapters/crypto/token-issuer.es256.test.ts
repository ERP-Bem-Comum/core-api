/**
 * W0 (RED) - contract-suite + casos especificos do ES256 (jose). Ticket: X2.
 *
 * CA4 (formato JWT) e CA5 (chave A nao verifica com chave B — sem forja). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateKeyPair } from 'jose';

import { makeEs256TokenIssuer } from '#src/modules/auth/adapters/crypto/token-issuer.es256.ts';
import { runTokenIssuerContract } from '../../application/ports/token-issuer.contract.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const makeIssuer = async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  return makeEs256TokenIssuer({ privateKey, publicKey, issuer: 'core-api', ttlSeconds: 900 });
};

runTokenIssuerContract('ES256 (jose)', { make: makeIssuer });

describe('ES256 — especificos', () => {
  it('CA4: token no formato JWT (3 segmentos)', async () => {
    const issuer = await makeIssuer();
    const r = await issuer.issueAccessToken({ userId: UserId.generate() });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.split('.').length, 3);
  });

  it('CA5: token de chave A nao verifica com chave B (sem forja)', async () => {
    const a = await makeIssuer();
    const b = await makeIssuer(); // outro par de chaves
    const issued = await a.issueAccessToken({ userId: UserId.generate() });
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    const v = await b.verifyAccessToken(issued.value);
    assert.equal(v.ok, false);
  });
});
