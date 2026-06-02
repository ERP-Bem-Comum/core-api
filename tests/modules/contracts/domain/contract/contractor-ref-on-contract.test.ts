// W0 RED — CTR-CONTRACT-CONTRACTOR-REF (CA2).
// O agregado `Contract` deve carregar `contractorRef` em TODAS as variantes
// (inclusive `Pending`), pois o contratado é conhecido no cadastro inicial
// (`ContractRegistration`). Estes testes falham até o W1:
//   1. criar o VO `contractor-ref.ts` (import abaixo falha no load), e
//   2. threading `contractorRef` em `CreateContractInput`/`CreatePendingContractInput`
//      e nos construtores `Contract.create`/`Contract.createPending`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor-ref.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  CreateContractInput,
  CreatePendingContractInput,
} from '#src/modules/contracts/domain/contract/types.ts';

const SUPPLIER_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';

const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};
const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};
const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const supplierRef = (): ContractorRef.ContractorRef => {
  const r = ContractorRef.rehydrate({ type: 'Supplier', id: SUPPLIER_V4 });
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

// Inputs estendidos com `contractorRef` — o campo entra em Create*Input no W1.
const activeInput = (): CreateContractInput & { contractorRef: ContractorRef.ContractorRef } => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks',
  signedAt: new Date('2026-01-01T00:00:00.000Z'),
  originalValue: money(10_000_000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractorRef: supplierRef(),
});

const pendingInput = (): CreatePendingContractInput & {
  contractorRef: ContractorRef.ContractorRef;
} => ({
  id: ContractId.generate(),
  sequentialNumber: '002/2026',
  title: 'Contrato pendente',
  objective: 'Objeto pendente',
  originalValue: money(5_000_000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  contractorRef: supplierRef(),
});

describe('Contract.create — carries contractorRef', () => {
  it('preserves the contractorRef on the created Active contract', () => {
    const input = activeInput();
    const r = Contract.create(input);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.contract.contractorRef, input.contractorRef);
  });
});

describe('Contract.createPending — carries contractorRef', () => {
  it('preserves the contractorRef on the created Pending contract', () => {
    const input = pendingInput();
    const r = Contract.createPending(input);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.contract.contractorRef, input.contractorRef);
  });
});
