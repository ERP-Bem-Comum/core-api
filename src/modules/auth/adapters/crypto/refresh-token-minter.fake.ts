/**
 * Adapter FAKE de RefreshTokenMinter (modulo auth) - contador determinístico, para testes.
 *
 * Convencao: `token` = `fake-refresh-<n>`; `tokenHash` = `${token}-hash`. Cada `mint` incrementa.
 * `hash(raw)` = `${raw}-hash` (mesma convencao -> hash(mint().token) === mint().tokenHash). ASCII puro.
 */

import type { RefreshTokenMinter } from '../../application/ports/refresh-token-minter.ts';

export const makeFakeRefreshTokenMinter = (): RefreshTokenMinter => {
  let counter = 0;
  return {
    mint: () => {
      counter += 1;
      const token = `fake-refresh-${String(counter)}`;
      return { token, tokenHash: `${token}-hash` };
    },
    hash: (raw) => `${raw}-hash`,
  };
};
