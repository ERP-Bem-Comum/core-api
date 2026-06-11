/**
 * W0 RED — 009-contract-auto-expire (T008/T014/T016).
 * Use case `expireDueContracts`: finaliza (Active → Expired) os contratos com vigência efetiva
 * encerrada (Active, Fixed, current_period_end < hoje_BRT), reusando Contract.expire + save([event]).
 *
 * US1: elegíveis expiram; não-elegíveis intactos.
 * US2: evento ContractExpired no outbox; idempotência (2ª execução = no-op).
 * US3: borda D+1 no fuso de Brasília (UTC-3) — end = hoje_BRT permanece Active.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  ActiveContract,
  Contract as ContractEntity,
} from '#src/modules/contracts/domain/contract/types.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { expireDueContracts } from '#src/modules/contracts/application/use-cases/expire-due-contracts.ts';

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};
const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error('fixture money');
  return r.value;
};
const contractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture contractor');
  return r.value;
})();

let seq = 0;
const activeContract = (endISO: string | null): ActiveContract => {
  seq += 1;
  const period =
    endISO === null
      ? Period.createIndefinite(pd('2026-01-01'))
      : (() => {
          const p = Period.create(pd('2026-01-01'), pd(endISO));
          if (!p.ok) throw new Error('fixture period');
          return p.value;
        })();
  const created = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: `${String(seq).padStart(4, '0')}/2026`,
    title: 'Contrato',
    objective: 'Objeto',
    signedAt: D('2026-01-01'),
    originalValue: money(1000),
    originalPeriod: period,
    contractor,
  });
  if (!created.ok) throw new Error(`fixture create: ${JSON.stringify(created.error)}`);
  return created.value.contract;
};

// Mundo com um conjunto de contratos persistidos; clock fixo define o cutoff BRT.
const world = async (clockAtISO: string, contracts: readonly ContractEntity[]) => {
  const outbox = InMemoryOutbox();
  const handle = InMemoryContractRepository(outbox.port);
  for (const c of contracts) {
    const saved = await handle.repo.save(c, []);
    assert.ok(saved.ok);
  }
  outbox.clear();
  const clock = ClockFixed(D(clockAtISO));
  return { outbox, contractRepo: handle.repo, clock, store: handle.store };
};

describe('expireDueContracts — US1: elegíveis expiram, não-elegíveis intactos', () => {
  it('Active + Fixed + end < hoje_BRT → Expired', async () => {
    const due = activeContract('2026-06-10');
    const w = await world('2026-06-11T12:00:00.000Z', [due]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 1);
    assert.equal(w.store().find((c) => c.id === due.id)?.status, 'Expired');
  });

  it('Indefinite e end no futuro NÃO expiram', async () => {
    const indef = activeContract(null);
    const future = activeContract('2026-12-31');
    const w = await world('2026-06-11T12:00:00.000Z', [indef, future]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 0);
    assert.equal(
      w.store().every((c) => c.status === 'Active'),
      true,
    );
  });

  it('Expired/Terminated/Pending/Cancelled não são reprocessados', async () => {
    // Active já expirado manualmente + um Pending — nenhum deve ser tocado.
    const already = Contract.expire(activeContract('2026-05-01'), D('2026-05-02'));
    assert.ok(already.ok);
    if (!already.ok) return;
    const pending = Contract.createPending({
      id: ContractId.generate(),
      sequentialNumber: '9000/2026',
      title: 'P',
      objective: 'O',
      originalValue: money(1000),
      originalPeriod: (() => {
        const p = Period.create(pd('2026-01-01'), pd('2026-02-01'));
        if (!p.ok) throw new Error('fx');
        return p.value;
      })(),
      contractor,
      createdAt: D('2026-01-01'),
    });
    assert.ok(pending.ok);
    if (!pending.ok) return;
    const w = await world('2026-07-01T12:00:00.000Z', [
      already.value.contract,
      pending.value.contract,
    ]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 0);
  });
});

describe('expireDueContracts — US2: evento + idempotência', () => {
  it('emite ContractEnded (kind Expired) no outbox', async () => {
    const due = activeContract('2026-06-10');
    const w = await world('2026-06-11T12:00:00.000Z', [due]);
    await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    const events = w.outbox.all();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, 'ContractEnded');
  });

  it('2ª execução é no-op (idempotência) — sem evento novo', async () => {
    const due = activeContract('2026-06-10');
    const w = await world('2026-06-11T12:00:00.000Z', [due]);
    const expire = expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock });
    await expire();
    w.outbox.clear();
    const r2 = await expire();
    assert.ok(isOk(r2));
    if (!r2.ok) return;
    assert.equal(r2.value.expired, 0);
    assert.equal(w.outbox.all().length, 0);
  });
});

describe('expireDueContracts — US3: borda D+1 (fuso de Brasília)', () => {
  it('end = hoje_BRT permanece Active (válido até o fim do último dia)', async () => {
    // 2026-06-11T12:00Z → hoje_BRT = 2026-06-11. end = 2026-06-11 NÃO é < cutoff.
    const sameDay = activeContract('2026-06-11');
    const w = await world('2026-06-11T12:00:00.000Z', [sameDay]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 0);
    assert.equal(w.store().find((c) => c.id === sameDay.id)?.status, 'Active');
  });

  it('boundary de fuso: 02:00Z mantém o contrato de end=2026-06-10 ainda Active', async () => {
    // 2026-06-11T02:00Z → BRT = 2026-06-10 (23:00). end 2026-06-10 NÃO é < 2026-06-10.
    const c = activeContract('2026-06-10');
    const w = await world('2026-06-11T02:00:00.000Z', [c]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 0);
  });

  it('boundary de fuso: 04:00Z já expira o contrato de end=2026-06-10', async () => {
    // 2026-06-11T04:00Z → BRT = 2026-06-11. end 2026-06-10 < 2026-06-11 → expira.
    const c = activeContract('2026-06-10');
    const w = await world('2026-06-11T04:00:00.000Z', [c]);
    const r = await expireDueContracts({ contractRepo: w.contractRepo, clock: w.clock })();
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.expired, 1);
  });
});
