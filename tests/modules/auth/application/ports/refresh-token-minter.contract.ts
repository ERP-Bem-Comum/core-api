/**
 * Suite de contrato compartilhada para RefreshTokenMinter (modulo auth). NAO executa direto. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { RefreshTokenMinter } from '#src/modules/auth/application/ports/refresh-token-minter.ts';

export interface RefreshTokenMinterFactory {
  make: () => RefreshTokenMinter;
}

export const runRefreshTokenMinterContract = (
  label: string,
  factory: RefreshTokenMinterFactory,
): void => {
  describe(`RefreshTokenMinter contract — ${label}`, () => {
    it('CA1: mint produz token e tokenHash nao-vazios', () => {
      const minted = factory.make().mint();
      assert.equal(minted.token.length > 0, true);
      assert.equal(minted.tokenHash.length > 0, true);
    });

    it('CA2: dois mint produzem tokens e hashes diferentes', () => {
      const minter = factory.make();
      const a = minter.mint();
      const b = minter.mint();
      assert.notEqual(a.token, b.token);
      assert.notEqual(a.tokenHash, b.tokenHash);
    });
  });
};
