// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA1).
// O agregado `Contract` deve carregar os 5 metadados de cadastro em TODAS as
// variantes (inclusive `Pending`), pois são conhecidos no cadastro inicial
// (`ContractRegistration`, abordagem A — mesmo lugar do `contractorRef`).
// Falha até o W1: (1) criar os VOs de enum; (2) adicionar os campos a
// `ContractRegistration` + `Create*Input`; (3) threading em `Contract.create`/
// `createPending`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor-ref.ts';
import * as Classification from '#src/modules/contracts/domain/contract/classification.ts';
import * as ContractModel from '#src/modules/contracts/domain/contract/contract-model.ts';
import * as Category from '#src/modules/contracts/domain/contract/category.ts';
import * as CostCenter from '#src/modules/contracts/domain/contract/cost-center.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  CreateContractInput,
  CreatePendingContractInput,
} from '#src/modules/contracts/domain/contract/types.ts';

const SUPPLIER_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`test fixture broken: ${String(r.error)}`);
  return r.value;
};

const pd = (iso: string) => unwrap(PlainDate.from(iso.slice(0, 10)));
const money = (cents: number) => unwrap(Money.fromCents(cents));
const fixedPeriod = (s: string, e: string) => unwrap(Period.create(pd(s), pd(e)));
const supplierRef = () => unwrap(ContractorRef.rehydrate({ type: 'Supplier', id: SUPPLIER_V4 }));

// Metadados de cadastro — os 5 campos que entram em ContractRegistration no W1.
const metadata = () => ({
  classification: unwrap(Classification.parse('Contract')),
  contractModel: unwrap(ContractModel.parse('Service')),
  category: unwrap(Category.parse('Operational')),
  costCenter: unwrap(CostCenter.parse('HR')),
  observations: 'Observação de cadastro',
});

type Meta = ReturnType<typeof metadata>;

const activeInput = (): CreateContractInput & Meta => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks',
  signedAt: new Date('2026-01-01T00:00:00.000Z'),
  originalValue: money(10_000_000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractorRef: supplierRef(),
  ...metadata(),
});

const pendingInput = (): CreatePendingContractInput & Meta => ({
  id: ContractId.generate(),
  sequentialNumber: '002/2026',
  title: 'Contrato pendente',
  objective: 'Objeto pendente',
  originalValue: money(5_000_000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  contractorRef: supplierRef(),
  ...metadata(),
});

describe('Contract.create — carries registration metadata', () => {
  it('preserves the 5 metadata fields on the created Active contract', () => {
    const input = activeInput();
    const r = Contract.create(input);
    assert.equal(r.ok, true);
    if (r.ok) {
      const c = r.value.contract;
      assert.equal(c.classification, input.classification);
      assert.equal(c.contractModel, input.contractModel);
      assert.equal(c.category, input.category);
      assert.equal(c.costCenter, input.costCenter);
      assert.equal(c.observations, input.observations);
    }
  });
});

describe('Contract.createPending — carries registration metadata', () => {
  it('preserves the 5 metadata fields on the created Pending contract', () => {
    const input = pendingInput();
    const r = Contract.createPending(input);
    assert.equal(r.ok, true);
    if (r.ok) {
      const c = r.value.contract;
      assert.equal(c.classification, input.classification);
      assert.equal(c.contractModel, input.contractModel);
      assert.equal(c.category, input.category);
      assert.equal(c.costCenter, input.costCenter);
      assert.equal(c.observations, input.observations);
    }
  });

  it('accepts null for the optional fields (category/costCenter/observations)', () => {
    const input = { ...pendingInput(), category: null, costCenter: null, observations: null };
    const r = Contract.createPending(input);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.contract.category, null);
      assert.equal(r.value.contract.costCenter, null);
      assert.equal(r.value.contract.observations, null);
    }
  });
});
