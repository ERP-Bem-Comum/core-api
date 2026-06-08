/**
 * CTR-HTTP-CONTRACT-LIST-FILTERS — W0 (RED) — use case listContracts paginado.
 *
 * DEVE FALHAR: `listContracts` ainda retorna `readonly Contract[]` e não recebe query.
 * GREEN quando o W1 mudar a assinatura para `(query) => Result<{ items, meta }, E>`,
 * delegando a filtragem/paginação ao `contractRepo.listPaged`.
 *
 * `meta.totalPages = ceil(total / limit)` (com total=0 → totalPages=0).
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { listContracts } from '#src/modules/contracts/application/use-cases/list-contracts.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';

import { buildContract } from '../../adapters/persistence/fixtures.ts';

const seed = async (repo: ContractRepository, n: number): Promise<void> => {
  for (let i = 0; i < n; i++) {
    const seq = String(i + 1).padStart(3, '0');
    await repo.save(
      buildContract({
        id: `${seq}11111-1111-4111-8111-111111111111`,
        sequentialNumber: `${seq}/2026`,
        title: `Contrato ${seq}`,
      }),
      [],
    );
  }
};

describe('listContracts (paginado) — CTR-HTTP-CONTRACT-LIST-FILTERS', () => {
  let repo: ContractRepository;

  beforeEach(() => {
    repo = InMemoryContractRepository().repo;
  });

  it('retorna { items, meta } com totalPages = ceil(total/limit)', async () => {
    await seed(repo, 5);
    const useCase = listContracts({ contractRepo: repo });
    const r = await useCase({ page: 1, limit: 2, order: 'ASC' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 2);
    assert.deepEqual(r.value.meta, {
      currentPage: 1,
      itemsPerPage: 2,
      itemCount: 2,
      totalItems: 5,
      totalPages: 3,
    });
  });

  it('meta reflete a página solicitada mesmo se vazia', async () => {
    await seed(repo, 3);
    const useCase = listContracts({ contractRepo: repo });
    const r = await useCase({ page: 5, limit: 10, order: 'ASC' });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 0);
    assert.deepEqual(r.value.meta, {
      currentPage: 5,
      itemsPerPage: 10,
      itemCount: 0,
      totalItems: 3,
      totalPages: 1,
    });
  });

  it('repo vazio → totalPages 0', async () => {
    const useCase = listContracts({ contractRepo: repo });
    const r = await useCase({ page: 1, limit: 20, order: 'ASC' });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.value.meta, {
      currentPage: 1,
      itemsPerPage: 20,
      itemCount: 0,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('propaga erro do repositório', async () => {
    const failing: ContractRepository = {
      findById: () => Promise.resolve({ ok: true, value: null }),
      findBySequentialNumber: () => Promise.resolve({ ok: true, value: null }),
      list: () => Promise.resolve({ ok: true, value: [] }),
      listPaged: () => Promise.resolve({ ok: false, error: 'contract-repo-unavailable' }),
      save: () => Promise.resolve({ ok: true, value: undefined }),
    };
    const useCase = listContracts({ contractRepo: failing });
    const r = await useCase({ page: 1, limit: 20, order: 'ASC' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'contract-repo-unavailable');
  });
});
