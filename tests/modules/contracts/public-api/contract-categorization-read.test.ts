/**
 * #178 — public-api de leitura da categorização do contrato (ADR-0006).
 * Dado um contractId, o financial lê categoria/programa/plano/CC (refs + labels) sem tocar `ctr_*` cru.
 * W0 RED: o read-port (in-memory) ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/adapters/persistence/repos/contract-categorization-read.in-memory.ts';
import type { ContractCategorizationView } from '#src/modules/contracts/application/ports/contract-categorization-read.ts';

const VIEW: ContractCategorizationView = {
  contractId: '11111111-1111-4111-8111-111111111111',
  programId: '77777777-7777-4777-8777-777777777777',
  budgetPlanId: '66666666-6666-4666-8666-666666666666',
  categorizacao: 'Custeio',
  centroDeCusto: 'CC-042',
};

describe('contract-categorization-read (public-api, #178)', () => {
  it('getCategorization retorna a categorização do contrato', async () => {
    const store = createInMemoryContractCategorizationReadStore(new Map([[VIEW.contractId, VIEW]]));
    const r = await store.getCategorization(VIEW.contractId);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, VIEW);
  });

  it('contrato inexistente → ok(null) (não é erro)', async () => {
    const store = createInMemoryContractCategorizationReadStore();
    const r = await store.getCategorization('22222222-2222-4222-8222-222222222222');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, null);
  });
});
