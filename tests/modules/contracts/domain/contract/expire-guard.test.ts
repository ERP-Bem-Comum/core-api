import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';

// CTR-AUTO-EXPIRE (issue #39) — W0 RED.
// Decisão da P.O.: vigência INCLUSIVA D+1 — o último dia da vigência conta inteiro;
// o contrato só expira a partir da ZERO HORA DO DIA SEGUINTE (at > end).
// A guarda atual (`contract.ts:251`) rejeita só quando `at < end`, logo expira em
// `at == end` — isto VIOLA o D+1 e é o teste RED principal abaixo.

const D = (iso: string): Date => new Date(iso);

const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(`fixture: ${r.error}`);
  return r.value;
};

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error('fixture: money');
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`fixture: ${r.error}`);
  return r.value;
};

const contractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture: contractor');
  return r.value;
})();

const validInput = (overrides: Partial<CreateContractInput> = {}): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Contrato de teste',
  objective: 'Objeto de teste',
  signedAt: D('2026-01-01'),
  originalValue: money(10000000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractor,
  ...overrides,
});

const createActive = (overrides: Partial<CreateContractInput> = {}) => {
  const r = Contract.create(validInput(overrides));
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value.contract;
};

describe('Contract.expire — guarda D+1 (CTR-AUTO-EXPIRE / issue #39)', () => {
  it('RED CA2: rejeita quando at == currentPeriod.end (o último dia conta inteiro)', () => {
    const active = createActive(); // currentPeriod.end = 2026-12-31
    const r = Contract.expire(active, D('2026-12-31')); // at == end
    assert.equal(isErr(r), true, 'at == end deve rejeitar — só expira no dia seguinte (D+1)');
    if (!r.ok) assert.equal(r.error.tag, 'ContractCannotExpireYet');
  });

  it('CA1: expira quando at > end (zero hora do dia seguinte)', () => {
    const active = createActive(); // end = 2026-12-31
    const r = Contract.expire(active, D('2027-01-01')); // at == end + 1
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.contract.status, 'Expired');
      assert.equal(r.value.event.type, 'ContractEnded');
      if (r.value.event.type === 'ContractEnded') {
        assert.equal(r.value.event.kind, 'Expired');
        assert.equal(r.value.event.terminationReason, null);
      }
    }
  });

  it('rejeita quando at < end (vigência em curso)', () => {
    const active = createActive(); // end = 2026-12-31
    const r = Contract.expire(active, D('2026-12-30')); // at == end - 1
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractCannotExpireYet');
  });

  it('CA3: rejeita contrato Indefinite', () => {
    const active = createActive({ originalPeriod: Period.createIndefinite(pd('2026-01-01')) });
    const r = Contract.expire(active, D('2027-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractCannotExpireIndefinitePeriod');
  });
});
