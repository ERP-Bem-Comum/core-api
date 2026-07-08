/**
 * PAR-CONTRACT-COUNT-BACKFILL · W0 (#110) — recompõe `activeCount` ABSOLUTO por contractorRef.
 * DEVE FALHAR até existir `backfillContractCounts` (puro) + `setCount` no `ContractCountStore`.
 *
 * `setCount` absoluto (não `applyDelta`) é o que garante CA2 (idempotência sob re-execução) e a
 * reconciliação de drift (#129): a recomputação a partir dos contratos vivos é a fonte da verdade.
 * Fundamento: Newman, *Building Microservices*, p.500 — "In idempotent operations, the outcome
 * doesn't change after the first application, even if the operation is subsequently applied
 * multiple times."
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.in-memory.ts';
import { backfillContractCounts } from '#src/jobs/partners/contract-count-backfill/backfill.ts';

const records = [
  { contractorRef: 'a', activeCount: 2 },
  { contractorRef: 'b', activeCount: 1 },
];

describe('backfillContractCounts', () => {
  it('CA1 — recompõe a contagem absoluta por contraparte a partir dos contratos vivos', async () => {
    const store = makeInMemoryContractCountStore();
    const r = await backfillContractCounts(records, store);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.applied, 2);
    const a = await store.getCount('a');
    const b = await store.getCount('b');
    if (a.ok) assert.equal(a.value, 2);
    if (b.ok) assert.equal(b.value, 1);
  });

  it('CA2 — idempotente: rodar 2x não duplica (prova setCount absoluto, não delta)', async () => {
    const store = makeInMemoryContractCountStore();
    await backfillContractCounts(records, store);
    await backfillContractCounts(records, store);
    const a = await store.getCount('a');
    if (a.ok) assert.equal(a.value, 2); // se fosse applyDelta, somaria → 4
  });

  it('reconcilia drift: sobrescreve contagem divergente pré-existente (#129)', async () => {
    const store = makeInMemoryContractCountStore([{ contractorRef: 'a', activeCount: 99 }]);
    await backfillContractCounts([{ contractorRef: 'a', activeCount: 2 }], store);
    const a = await store.getCount('a');
    if (a.ok) assert.equal(a.value, 2); // absoluto: 2, nunca 99 nem 101
  });
});
