/**
 * W0 (RED) - contract + especifico (tokenHash = sha256(token)) do minter real. Ticket: A5b. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import { makeNodeRefreshTokenMinter } from '#src/modules/auth/adapters/crypto/refresh-token-minter.node.ts';
import { runRefreshTokenMinterContract } from '../../application/ports/refresh-token-minter.contract.ts';

runRefreshTokenMinterContract('Node (randomBytes+sha256)', {
  make: () => makeNodeRefreshTokenMinter(),
});

describe('Node minter — especifico', () => {
  it('CA3: tokenHash = sha256(token) em hex', () => {
    const { token, tokenHash } = makeNodeRefreshTokenMinter().mint();
    const expected = createHash('sha256').update(token).digest('hex');
    assert.equal(tokenHash, expected);
  });

  it('A6a/CA4: hash(x) = sha256(x) em hex', () => {
    const expected = createHash('sha256').update('valor-arbitrario').digest('hex');
    assert.equal(makeNodeRefreshTokenMinter().hash('valor-arbitrario'), expected);
  });
});
