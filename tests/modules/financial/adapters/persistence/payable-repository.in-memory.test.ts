/**
 * Test runner para `InMemoryPayableRepository` consumindo a suite de contrato
 * compartilhada.
 *
 * Pattern: `tests/modules/contracts/adapters/persistence/contract-repository.shape.test.ts`.
 *
 * Quando o adapter Drizzle/MySQL real existir (ticket futuro), outro arquivo
 * `.test.ts` consumirá a MESMA suite com um factory diferente.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { runPayableRepositoryContract } from './payable-repository.suite.ts';
import { runPayableRepositoryShapeContract } from '../../domain/payable/repository.contract.ts';

// Shape do port (compile-time check).
runPayableRepositoryShapeContract('InMemory');

// Suite comportamental — InMemory passa por todos os cenários.
// CA-5 (FIN-USECASE-APPROVE-PAYABLE): factory injeta `outbox.port` no
// `InMemoryPayableRepository(outbox.port)` e expõe `outboxHelpers` para o
// teste CA-14 inspecionar eventos propagados via `repo.save(p, [event])`.
runPayableRepositoryContract('InMemory', {
  // eslint-disable-next-line @typescript-eslint/require-await
  make: async () => {
    const outbox = InMemoryOutbox();
    const handle = InMemoryPayableRepository(outbox.port);
    return {
      repo: handle.repo,
      outboxHelpers: {
        all: outbox.all,
        pending: outbox.pending,
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      teardown: async () => {
        handle.clear();
        outbox.clear();
      },
    };
  },
});

// Handle-specific test — store/clear são propriedades do InMemoryHandle (CA-13).
describe('InMemoryPayableRepository — handle utilities (CA-13)', () => {
  it('exposes repo, store, and clear', () => {
    const handle = InMemoryPayableRepository();
    assert.equal(typeof handle.repo, 'object');
    assert.equal(typeof handle.store, 'function');
    assert.equal(typeof handle.clear, 'function');
  });

  it('clear esvazia o store', () => {
    const handle = InMemoryPayableRepository();
    handle.clear();
    assert.deepEqual(handle.store(), []);
  });
});
