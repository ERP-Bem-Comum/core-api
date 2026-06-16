import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';

// CTR-AUTO-EXPIRE (issue #39) — W0 RED. O job ainda NÃO existe (W1 cria
// `src/jobs/contracts/sweeper/sweeper.ts`). Contrato de API esperado:
//
//   runSweep(
//     deps: { contractRepo: ContractRepository /* + findExpirable (W1) */, clock: Clock },
//     config: { batchSize: number },
//   ): Promise<Result<{ expired: number; scanned: number }, SweepError>>
//
// O W1 também adiciona ao port: findExpirable(cutoff: PlainDate, limit: number)
//   => Promise<Result<readonly ActiveContract[], ContractRepositoryError>>  (FOR UPDATE SKIP LOCKED).
import { runSweep } from '#src/jobs/contracts/sweeper/sweeper.ts';

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string) => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(`fixture: ${r.error}`);
  return r.value;
};
const money = (c: number) => {
  const r = Money.fromCents(c);
  if (!r.ok) throw new Error('fixture: money');
  return r.value;
};
const fixedPeriod = (s: string, e: string) => {
  const r = Period.create(pd(s), pd(e));
  if (!r.ok) throw new Error(`fixture: ${r.error}`);
  return r.value;
};
const contractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture: contractor');
  return r.value;
})();
const validInput = (o: Partial<CreateContractInput> = {}): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Contrato de teste',
  objective: 'Objeto',
  signedAt: D('2026-01-01'),
  originalValue: money(10000000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractor,
  ...o,
});
const createActive = (o: Partial<CreateContractInput> = {}) => {
  const r = Contract.create(validInput(o));
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value.contract;
};

// Clock fake: hoje = dia seguinte ao fim; now() em 03h UTC = 00h America/Sao_Paulo (UTC-3).
const clockAt = (todayISO: string) => ({
  now: (): Date => D(`${todayISO}T03:00:00.000Z`),
  today: () => pd(todayISO),
});

// Repo fake: o sweep usa apenas findExpirable + save; o resto lança se tocado.
const makeRepo = (expirable: readonly unknown[]) => {
  const saved: { contract: unknown; events: readonly unknown[] }[] = [];
  const stub = () => {
    throw new Error('método do repo não deve ser usado pelo sweep');
  };
  const repo = {
    findById: stub,
    findBySequentialNumber: stub,
    nextSequentialNumber: stub,
    list: stub,
    listPaged: stub,
    findExpirable: (_cutoff: PlainDate.PlainDate, _limit: number) => Promise.resolve(ok(expirable)),
    save: (contract: unknown, events: readonly unknown[]) => {
      saved.push({ contract, events });
      return Promise.resolve(ok(undefined));
    },
  } as unknown as ContractRepository;
  return { repo, saved };
};

describe('runSweep — auto-expire one-shot (CTR-AUTO-EXPIRE / issue #39)', () => {
  it('RED CA1: expira cada elegível e persiste state + ContractEnded{Expired} (mesma tx)', async () => {
    const { repo, saved } = makeRepo([
      createActive(),
      createActive({ originalPeriod: fixedPeriod('2026-01-01', '2026-06-30') }),
    ]);

    const r = await runSweep(
      { contractRepo: repo, clock: clockAt('2027-01-01') },
      { batchSize: 100 },
    );

    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.expired, 2);
    assert.equal(saved.length, 2, 'cada elegível é salvo uma vez');
    for (const s of saved) {
      assert.equal(s.events.length, 1, 'um evento por contrato');
      assert.equal((s.events[0] as { type: string }).type, 'ContractEnded');
      assert.equal((s.events[0] as { kind: string }).kind, 'Expired');
    }
  });

  it('RED CA5: repassa o batchSize ao findExpirable (cap do lote / FOR UPDATE SKIP LOCKED)', async () => {
    let limitSeen = -1;
    const stub = () => {
      throw new Error('não usado');
    };
    const repo = {
      findById: stub,
      findBySequentialNumber: stub,
      nextSequentialNumber: stub,
      list: stub,
      listPaged: stub,
      findExpirable: (_cutoff: PlainDate.PlainDate, limit: number) => {
        limitSeen = limit;
        return Promise.resolve(ok([]));
      },
      save: () => Promise.resolve(ok(undefined)),
    } as unknown as ContractRepository;

    await runSweep({ contractRepo: repo, clock: clockAt('2027-01-01') }, { batchSize: 50 });
    assert.equal(limitSeen, 50);
  });
});
