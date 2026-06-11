/**
 * W0 RED — 009-contract-auto-expire (T003). `ContractRepository.findExpirable(cutoff)` (in-memory):
 * retorna só Active + Fixed + current_period_end < cutoff.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string) => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error('fx pd');
  return r.value;
};
const money = (c: number) => {
  const r = Money.fromCents(c);
  if (!r.ok) throw new Error('fx money');
  return r.value;
};
const contractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fx contractor');
  return r.value;
})();
let seq = 0;
const active = (endISO: string | null) => {
  seq += 1;
  const period =
    endISO === null
      ? Period.createIndefinite(pd('2026-01-01'))
      : (() => {
          const p = Period.create(pd('2026-01-01'), pd(endISO));
          if (!p.ok) throw new Error('fx period');
          return p.value;
        })();
  const c = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: `${String(seq).padStart(4, '0')}/2026`,
    title: 'C',
    objective: 'O',
    signedAt: D('2026-01-01'),
    originalValue: money(1000),
    originalPeriod: period,
    contractor,
  });
  if (!c.ok) throw new Error('fx create');
  return c.value.contract;
};

describe('ContractRepository.findExpirable (in-memory)', () => {
  it('retorna só Active+Fixed+end<cutoff', async () => {
    const handle = InMemoryContractRepository();
    const due = active('2026-06-09');
    const sameDay = active('2026-06-11'); // == cutoff → não
    const future = active('2026-12-31');
    const indef = active(null);
    const expired = Contract.expire(active('2026-05-01'), D('2026-05-02'));
    if (!expired.ok) throw new Error('fx expire');
    for (const c of [due, sameDay, future, indef, expired.value.contract]) {
      await handle.repo.save(c, []);
    }

    const r = await handle.repo.findExpirable(pd('2026-06-11'));
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.length, 1);
    assert.equal(r.value[0]?.id, due.id);
    assert.equal(r.value[0]?.status, 'Active');
  });

  it('cutoff sem elegíveis → lista vazia', async () => {
    const handle = InMemoryContractRepository();
    await handle.repo.save(active('2026-12-31'), []);
    const r = await handle.repo.findExpirable(pd('2026-06-11'));
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.length, 0);
  });
});
