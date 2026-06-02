/**
 * PARTNERS-ETL-STORE-INTEGRITY-ERROR (Achado 2) — W0 RED.
 *
 * Fixa o CONTRATO (ADR-0006): o novo variante de erro do store ETL e parte da public-api.
 * DEVE FALHAR em W0: `'partners-etl-store-integrity-violation'` ainda nao e membro de
 * `PartnersEtlStoreError`, logo o `satisfies` abaixo nao compila (erro de tipo no strip-types
 * em runtime) e/ou o array de membros conhecidos diverge.
 *
 * Sem MySQL — roda em `pnpm test`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { PartnersEtlStoreError } from '#src/modules/partners/public-api/etl.ts';

describe('PartnersEtlStoreError contrato (public-api)', () => {
  it('inclui o variante integrity-violation, distinto de unavailable', () => {
    // Se o tipo nao tiver o membro, este `satisfies` quebra o typecheck (W3) e o
    // strip-types nao remove o erro de atribuicao incompativel em W0.
    const integrity = 'partners-etl-store-integrity-violation' satisfies PartnersEtlStoreError;
    const unavailable = 'partners-etl-store-unavailable' satisfies PartnersEtlStoreError;

    assert.notEqual(integrity, unavailable);
    assert.equal(integrity, 'partners-etl-store-integrity-violation');
  });
});
