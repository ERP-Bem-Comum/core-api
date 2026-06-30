/**
 * CTR-NUMBER-PROGRAM — W0 (RED) — classificação CT/OS + metadados de cadastro.
 *
 * DEVE FALHAR: hoje `Contract.create`/`createPending` não aceitam nem carregam `classification`,
 * `programId`, `budgetPlanId`, `categorizacao`, `centroDeCusto`. GREEN no W1 (registration metadata).
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

const pd = (iso: string) => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const money = (c: number) => {
  const r = Money.fromCents(c);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const period = () => {
  const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const contractor = () => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('contractor');
  return r.value;
};

const PROGRAM_ID = '77777777-7777-4777-8777-777777777777';
const BUDGET_PLAN_ID = '88888888-8888-4888-8888-888888888888';

const metaInput = () => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Contrato',
  objective: 'Objetivo',
  originalValue: money(10_000_000),
  originalPeriod: period(),
  contractor: contractor(),
  // Novos campos (CTR-NUMBER-PROGRAM):
  classification: 'OS' as const,
  programId: PROGRAM_ID,
  budgetPlanId: BUDGET_PLAN_ID,
  categorizacao: 'Investimento',
  centroDeCusto: 'CC-100',
});

describe('Contract.create — classificação + metadados (CTR-NUMBER-PROGRAM)', () => {
  it('carrega classification + programId + budgetPlanId + categorizacao + centroDeCusto', () => {
    const r = Contract.create({ ...metaInput(), signedAt: new Date('2026-01-01') });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract;
    assert.equal(c.classification, 'OS');
    assert.equal(c.programId, PROGRAM_ID);
    assert.equal(c.budgetPlanId, BUDGET_PLAN_ID);
    assert.equal(c.categorizacao, 'Investimento');
    assert.equal(c.centroDeCusto, 'CC-100');
  });

  it('default classification = CT quando ausente', () => {
    // Omite `classification` (exactOptionalPropertyTypes: não passar undefined explícito).
    const { classification: _omit, ...rest } = metaInput();
    void _omit;
    const r = Contract.create({ ...rest, signedAt: new Date('2026-01-01') });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.contract.classification, 'CT');
  });

  it('rejeita classification fora de CT|OS', () => {
    const r = Contract.create({
      ...metaInput(),
      signedAt: new Date('2026-01-01'),
      classification: 'XX' as 'CT',
    });
    assert.equal(r.ok, false);
  });
});

describe('Contract.createPending — classificação + metadados (CTR-NUMBER-PROGRAM)', () => {
  it('PendingContract carrega os metadados', () => {
    const r = Contract.createPending({ ...metaInput(), createdAt: new Date('2026-01-10') });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.classification, 'OS');
    assert.equal(r.value.contract.programId, PROGRAM_ID);
    assert.equal(r.value.contract.centroDeCusto, 'CC-100');
  });
});
