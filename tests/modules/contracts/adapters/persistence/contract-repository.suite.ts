// Suite de contrato compartilhada para ContractRepository.
// Recebe um factory de repositório (sync ou async). Toda implementação —
// InMemory, Drizzle/SQLite, Drizzle/MySQL — passa pelos MESMOS cenários.
// Divergências = bugs de mapeamento ou drift de schema.

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';
import type { Contract, ActiveContract } from '#src/modules/contracts/domain/contract/types.ts';
import { Contract as ContractAgg } from '#src/modules/contracts/domain/contract/contract.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as Period from '#src/shared/kernel/period.ts';

import { buildContract } from './fixtures.ts';

export interface ContractRepoFactory {
  make: () => Promise<{
    repo: ContractRepository;
    teardown?: () => Promise<void>;
  }>;
}

const unwrapId = (raw: string) => {
  const r = ContractId.rehydrate(raw);
  if (!r.ok) throw new Error(`bad id fixture: ${r.error}`);
  return r.value;
};

const expectContract = async (
  repo: ContractRepository,
  id: ReturnType<typeof unwrapId>,
  ctx: string,
): Promise<ActiveContract> => {
  const r = await repo.findById(id);
  if (!r.ok) throw new Error(`${ctx}: findById falhou — ${JSON.stringify(r.error)}`);
  if (r.value === null) throw new Error(`${ctx}: contrato não encontrado`);
  // A suite persiste apenas contratos Active; narrowing falha claro se não for.
  const active = ContractAgg.parseActive(r.value);
  if (!active.ok) throw new Error(`${ctx}: esperado ActiveContract, status=${r.value.status}`);
  return active.value;
};

export const runContractRepositoryContract = (
  label: string,
  factory: ContractRepoFactory,
): void => {
  describe(`ContractRepository contract — ${label}`, () => {
    let repo: ContractRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown !== undefined) await teardown();
    };

    it('findById em repo vazio retorna ok(null)', async () => {
      try {
        const r = await repo.findById(unwrapId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
        assert.equal(r.ok, true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('list em repo vazio retorna ok([])', async () => {
      try {
        const r = await repo.list();
        assert.equal(r.ok, true);
        if (r.ok) assert.deepEqual(r.value, []);
      } finally {
        await cleanup();
      }
    });

    it('findBySequentialNumber em repo vazio retorna ok(null)', async () => {
      try {
        const r = await repo.findBySequentialNumber('001/2026');
        assert.equal(r.ok, true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('save + findById preserva todos os campos (round-trip Fixed period)', async () => {
      try {
        const c = buildContract({
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          sequentialNumber: '042/2026',
          title: 'Round-trip Fixed',
          objective: 'Validar persistência de período fixo',
          signedAtISO: '2026-01-15',
          originalValueCents: 12_345_678,
          periodKind: 'Fixed',
          periodStartISO: '2026-02-01',
          periodEndISO: '2026-12-31',
        });
        // CA1 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        const save = await repo.save(c, []);
        assert.equal(save.ok, true);

        const got = await expectContract(repo, c.id, 'round-trip Fixed');
        assert.equal(got.id, c.id);
        assert.equal(got.sequentialNumber, c.sequentialNumber);
        assert.equal(got.title, c.title);
        assert.equal(got.objective, c.objective);
        assert.equal(got.signedAt.getTime(), c.signedAt.getTime());
        assert.equal(got.originalValue.cents, c.originalValue.cents);
        assert.equal(got.currentValue.cents, c.currentValue.cents);
        assert.equal(got.status, 'Active');
        // CTR-DOMAIN-STATE-MACHINE-CONTRACT — ActiveContract não tem campo `endedAt`.
        assert.equal('endedAt' in got, false, 'ActiveContract não deve expor endedAt');
        assert.deepEqual([...got.homologatedAmendmentIds], []);
        assert.equal(Period.equals(got.originalPeriod, c.originalPeriod), true);
        assert.equal(Period.equals(got.currentPeriod, c.currentPeriod), true);
        assert.equal(got.originalPeriod.kind, 'Fixed');
      } finally {
        await cleanup();
      }
    });

    it('save + findById preserva Indefinite period (period_end nullable)', async () => {
      try {
        const c = buildContract({
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          sequentialNumber: '043/2026',
          periodKind: 'Indefinite',
          periodStartISO: '2026-02-01',
        });
        await repo.save(c, []);
        const got = await expectContract(repo, c.id, 'round-trip Indefinite');
        assert.equal(got.originalPeriod.kind, 'Indefinite');
        assert.equal(got.currentPeriod.kind, 'Indefinite');
        assert.equal(Period.equals(got.originalPeriod, c.originalPeriod), true);
      } finally {
        await cleanup();
      }
    });

    it('save preserva precisão de Money em valores grandes (cents próximo de MAX_SAFE_INTEGER)', async () => {
      try {
        const bigCents = Number.MAX_SAFE_INTEGER - 7;
        const c = buildContract({
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          sequentialNumber: '044/2026',
          originalValueCents: bigCents,
        });
        await repo.save(c, []);
        const got = await expectContract(repo, c.id, 'big cents');
        assert.equal(got.originalValue.cents, bigCents);
        assert.equal(got.currentValue.cents, bigCents);
      } finally {
        await cleanup();
      }
    });

    it('findBySequentialNumber retorna o contrato pelo número canônico', async () => {
      try {
        const a = buildContract({
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          sequentialNumber: '101/2026',
        });
        const b = buildContract({
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          sequentialNumber: '102/2026',
        });
        await repo.save(a, []);
        await repo.save(b, []);

        const found = await repo.findBySequentialNumber('102/2026');
        if (!found.ok)
          throw new Error(`findBySequentialNumber falhou: ${JSON.stringify(found.error)}`);
        if (found.value === null) throw new Error('102/2026 não encontrado');
        assert.equal(found.value.id, b.id);
      } finally {
        await cleanup();
      }
    });

    it('list retorna todos os contratos persistidos', async () => {
      try {
        const ids = [
          '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          '33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ];
        for (const [idx, id] of ids.entries()) {
          await repo.save(
            buildContract({
              id,
              sequentialNumber: `${String(200 + idx).padStart(3, '0')}/2026`,
            }),
            [],
          );
        }
        const r = await repo.list();
        if (!r.ok) throw new Error(`list falhou: ${JSON.stringify(r.error)}`);
        assert.equal(r.value.length, 3);
        const persistedIds = new Set(r.value.map((c: Contract) => c.id as unknown as string));
        for (const id of ids) {
          assert.equal(persistedIds.has(id), true, `id ${id} ausente em list()`);
        }
      } finally {
        await cleanup();
      }
    });

    it('save com mesmo ID é idempotente (upsert): substitui em vez de duplicar', async () => {
      try {
        const id = '99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const v1 = buildContract({ id, sequentialNumber: '301/2026', title: 'V1' });
        const v2 = buildContract({ id, sequentialNumber: '301/2026', title: 'V2 atualizado' });
        await repo.save(v1, []);
        await repo.save(v2, []);
        const list = await repo.list();
        if (!list.ok) throw new Error(`list falhou: ${JSON.stringify(list.error)}`);
        assert.equal(list.value.length, 1);
        const got = await expectContract(repo, v1.id, 'idempotent save');
        assert.equal(got.title, 'V2 atualizado');
      } finally {
        await cleanup();
      }
    });

    it('valor de 1 cent (mínimo positivo) é aceito e round-tripa', async () => {
      try {
        const c = buildContract({
          id: '88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sequentialNumber: '401/2026',
          originalValueCents: 1,
        });
        await repo.save(c, []);
        const got = await expectContract(repo, c.id, 'one cent');
        assert.equal(got.originalValue.cents, 1);
      } finally {
        await cleanup();
      }
    });

    it('busca por ID com UUID inexistente retorna null sem corromper estado', async () => {
      try {
        const present = buildContract({
          id: '77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sequentialNumber: '501/2026',
        });
        await repo.save(present, []);

        const absent = await repo.findById(unwrapId('66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
        assert.equal(absent.ok, true);
        if (absent.ok) assert.equal(absent.value, null);

        const got = await expectContract(repo, present.id, 'still there');
        assert.equal(got.id, present.id);
      } finally {
        await cleanup();
      }
    });

    it('signedAt preserva milissegundos no round-trip', async () => {
      try {
        const signedAtISO = '2026-01-15T14:23:45.678Z';
        const c = buildContract({
          id: '55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sequentialNumber: '601/2026',
          signedAtISO,
        });
        await repo.save(c, []);
        const got = await expectContract(repo, c.id, 'ms precision');
        assert.equal(got.signedAt.toISOString(), signedAtISO);
      } finally {
        await cleanup();
      }
    });
  });
};
