// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA3, regra R1).
// Teto de Ordem de Serviço: `classification = 'ServiceOrder'` →
// `originalValue.cents ≤ 999_999` (R$ 9.999,99). Acima disso, `Contract.create`/
// `createPending` falham com o tagged error `ContractServiceOrderExceedsCap`
// (Padrão D — payload de evidência: cap + attempted). `classification = 'Contract'`
// não tem teto. Falha até o W1 modelar a regra em `contract.ts` + `errors.ts`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor-ref.ts';
import * as Classification from '#src/modules/contracts/domain/contract/classification.ts';
import * as ContractModel from '#src/modules/contracts/domain/contract/contract-model.ts';
import {
  Contract,
  SERVICE_ORDER_CAP_CENTS,
} from '#src/modules/contracts/domain/contract/contract.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';

const SUPPLIER_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`test fixture broken: ${String(r.error)}`);
  return r.value;
};
const pd = (iso: string) => unwrap(PlainDate.from(iso.slice(0, 10)));
const money = (cents: number) => unwrap(Money.fromCents(cents));
const fixedPeriod = (s: string, e: string) => unwrap(Period.create(pd(s), pd(e)));
const supplierRef = () => unwrap(ContractorRef.rehydrate({ type: 'Supplier', id: SUPPLIER_V4 }));

const input = (classificationRaw: string, cents: number): CreateContractInput =>
  ({
    id: ContractId.generate(),
    sequentialNumber: '001/2026',
    title: 'OS de manutenção',
    objective: 'Serviço pontual',
    signedAt: new Date('2026-01-01T00:00:00.000Z'),
    originalValue: money(cents),
    originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
    contractorRef: supplierRef(),
    classification: unwrap(Classification.parse(classificationRaw)),
    contractModel: unwrap(ContractModel.parse('Service')),
    category: null,
    costCenter: null,
    observations: null,
  }) as CreateContractInput;

describe('R1 — Service Order value cap', () => {
  it('rejects a ServiceOrder above the cap with ContractServiceOrderExceedsCap', () => {
    const r = Contract.create(input('ServiceOrder', SERVICE_ORDER_CAP_CENTS + 1));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractServiceOrderExceedsCap');
      // payload de evidência (D§23): o teto e o valor tentado.
      if (r.error.tag === 'ContractServiceOrderExceedsCap') {
        assert.equal(r.error.cap.cents, SERVICE_ORDER_CAP_CENTS);
        assert.equal(r.error.attempted.cents, SERVICE_ORDER_CAP_CENTS + 1);
      }
    }
  });

  it('accepts a ServiceOrder exactly at the cap', () => {
    const r = Contract.create(input('ServiceOrder', SERVICE_ORDER_CAP_CENTS));
    assert.equal(r.ok, true);
  });

  it('does not cap a Contract (only ServiceOrder is capped)', () => {
    const r = Contract.create(input('Contract', 50_000_000));
    assert.equal(r.ok, true);
  });
});
