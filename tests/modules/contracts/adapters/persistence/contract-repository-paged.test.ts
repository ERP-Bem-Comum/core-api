/**
 * CTR-HTTP-CONTRACT-LIST-FILTERS — W0 (RED) — listPaged no InMemoryContractRepository.
 *
 * DEVE FALHAR: `ContractRepository.listPaged` ainda não existe (nem na interface nem
 * no adapter InMemory). GREEN quando o W1 adicionar o método à interface + InMemory
 * (filtra/ordena/pagina em memória, espelhando o comportamento que o Drizzle fará no SQL).
 *
 * Cobre: paginação (page/limit + meta total/totalPages), busca textual
 * (title/objective/sequentialNumber, case-insensitive), filtro por status, ordenação
 * (ASC|DESC por sequentialNumber), e defaults.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';

import {
  buildContract,
  buildExpiredContract,
  buildTerminatedContract,
  someContractor,
} from './fixtures.ts';

// IDs estáveis (UUID v4) — um por contrato semeado.
const ID = {
  alpha: 'a1111111-1111-4111-8111-111111111111',
  beta: 'b2222222-2222-4222-8222-222222222222',
  gamma: 'c3333333-3333-4333-8333-333333333333',
  delta: 'd4444444-4444-4444-8444-444444444444',
  epsilon: 'e5555555-5555-4555-8555-555555555555',
} as const;

const seedFive = async (repo: ContractRepository): Promise<void> => {
  // 5 contratos com sequentialNumber distintos e títulos/objetivos variados.
  await repo.save(
    buildContract({
      id: ID.alpha,
      sequentialNumber: '001/2026',
      title: 'Limpeza predial',
      objective: 'Serviço de limpeza',
    }),
    [],
  );
  await repo.save(
    buildContract({
      id: ID.beta,
      sequentialNumber: '002/2026',
      title: 'Manutenção elétrica',
      objective: 'Reparos na rede',
    }),
    [],
  );
  await repo.save(
    buildContract({
      id: ID.gamma,
      sequentialNumber: '003/2026',
      title: 'Consultoria contábil',
      objective: 'Auditoria de LIMPEZA fiscal',
    }),
    [],
  );
  // Um Expired e um Terminated para os filtros de status.
  await repo.save(
    buildExpiredContract({ id: ID.delta, sequentialNumber: '004/2026', title: 'Obra antiga' }),
    [],
  );
  await repo.save(
    buildTerminatedContract({
      id: ID.epsilon,
      sequentialNumber: '005/2026',
      title: 'Contrato distratado',
    }),
    [],
  );
};

describe('ContractRepository.listPaged (InMemory) — CTR-HTTP-CONTRACT-LIST-FILTERS', () => {
  let repo: ContractRepository;

  beforeEach(async () => {
    repo = InMemoryContractRepository().repo;
    await seedFive(repo);
  });

  it('CA1: page/limit pagina e meta reporta total correto', async () => {
    const r = await repo.listPaged({ page: 1, limit: 2, order: 'ASC' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 2);
    assert.equal(r.value.total, 5);
  });

  it('CA1: segunda página continua a partir do offset', async () => {
    const p1 = await repo.listPaged({ page: 1, limit: 2, order: 'ASC' });
    const p2 = await repo.listPaged({ page: 2, limit: 2, order: 'ASC' });
    assert.ok(p1.ok && p2.ok);
    if (!p1.ok || !p2.ok) return;
    assert.equal(p1.value.items[0]?.sequentialNumber, '001/2026');
    assert.equal(p2.value.items[0]?.sequentialNumber, '003/2026');
    assert.equal(p2.value.total, 5);
  });

  it('CA1: página além do total retorna items vazio mas total preservado', async () => {
    const r = await repo.listPaged({ page: 99, limit: 2, order: 'ASC' });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 0);
    assert.equal(r.value.total, 5);
  });

  it('CA2: search filtra por title (case-insensitive)', async () => {
    const r = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', search: 'limpeza' });
    assert.ok(r.ok);
    if (!r.ok) return;
    // "Limpeza predial" (title) + "Auditoria de LIMPEZA fiscal" (objective) = 2.
    assert.equal(r.value.total, 2);
    const nums = r.value.items.map((c) => c.sequentialNumber).sort();
    assert.deepEqual(nums, ['001/2026', '003/2026']);
  });

  it('CA2: search filtra por sequentialNumber', async () => {
    const r = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', search: '002/2026' });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.total, 1);
    assert.equal(r.value.items[0]?.sequentialNumber, '002/2026');
  });

  it('CA3: status filtra pelos estados existentes', async () => {
    const active = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', status: 'Active' });
    assert.ok(active.ok);
    if (!active.ok) return;
    assert.equal(active.value.total, 3); // alpha, beta, gamma
    assert.ok(active.value.items.every((c) => c.status === 'Active'));

    const expired = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', status: 'Expired' });
    assert.ok(expired.ok);
    if (!expired.ok) return;
    assert.equal(expired.value.total, 1);
    assert.equal(expired.value.items[0]?.status, 'Expired');
  });

  it('CA4: order ASC/DESC inverte a ordenação por sequentialNumber', async () => {
    const asc = await repo.listPaged({ page: 1, limit: 50, order: 'ASC' });
    const desc = await repo.listPaged({ page: 1, limit: 50, order: 'DESC' });
    assert.ok(asc.ok && desc.ok);
    if (!asc.ok || !desc.ok) return;
    assert.equal(asc.value.items[0]?.sequentialNumber, '001/2026');
    assert.equal(desc.value.items[0]?.sequentialNumber, '005/2026');
  });

  it('CA6: search + status combinam (AND)', async () => {
    const r = await repo.listPaged({
      page: 1,
      limit: 50,
      order: 'ASC',
      search: 'limpeza',
      status: 'Active',
    });
    assert.ok(r.ok);
    if (!r.ok) return;
    // 2 matches de "limpeza", ambos Active.
    assert.equal(r.value.total, 2);
  });

  it('listPaged em repo vazio retorna items:[] e total:0', async () => {
    const empty = InMemoryContractRepository().repo;
    const r = await empty.listPaged({ page: 1, limit: 20, order: 'ASC' });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual([...r.value.items], []);
    assert.equal(r.value.total, 0);
  });

  it('#116: filtra os contratos de um contratante (contractorId)', async () => {
    const SUP_A = '6a000000-0000-4000-8000-000000000001';
    const SUP_B = '6a000000-0000-4000-8000-000000000002';
    const fresh = InMemoryContractRepository().repo;
    await fresh.save(
      buildContract({ id: ID.alpha, sequentialNumber: '010/2026', contractorId: SUP_A }),
      [],
    );
    await fresh.save(
      buildContract({ id: ID.beta, sequentialNumber: '011/2026', contractorId: SUP_A }),
      [],
    );
    await fresh.save(
      buildContract({ id: ID.gamma, sequentialNumber: '012/2026', contractorId: SUP_B }),
      [],
    );

    const onlyA = await fresh.listPaged({
      page: 1,
      limit: 50,
      order: 'ASC',
      contractorId: someContractor('supplier', SUP_A).id,
    });
    assert.ok(onlyA.ok);
    if (onlyA.ok) {
      assert.equal(onlyA.value.total, 2);
      assert.ok(onlyA.value.items.every((c) => String(c.contractor.id) === SUP_A));
    }
  });
});
