// W0 RED — CTR-CONTRACT-CONTRACTOR-REF (CA3).
// O mapper de persistência deve (a) reidratar `contractorRef` a partir das
// colunas `contractor_type`/`contractor_id` e (b) rejeitar `contractor_type`
// inválido vindo do banco com um erro tipado. Falha até o W1:
//   1. adicionar as colunas ao schema (`ContractRow` ganha contractorType/Id),
//   2. ler/escrever o contractorRef em `contractFromRow`/`contractToInsert`, e
//   3. introduzir a variante `ContractMapperInvalidContractorType`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  contractFromRow,
  type ContractRow,
} from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';

const VALID_ID = '7f3a1234-5678-4abc-9def-fedcba987654';
const SUPPLIER_ID = '11112222-3333-4444-8555-666677778888';

// Linha de um contrato Active. As colunas `contractorType`/`contractorId` entram
// no schema no W1 — por isso a interseção explícita aqui (o `$inferSelect` atual
// ainda não as conhece).
type RowWithContractor = ContractRow & {
  contractorType: string;
  contractorId: string;
};

const activeRow = (overrides: Partial<RowWithContractor> = {}): RowWithContractor => ({
  id: VALID_ID,
  sequentialNumber: '001/2026',
  title: 'Contrato X',
  objective: 'Objetivo X',
  signedAt: new Date('2026-01-01T00:00:00.000Z'),
  originalValueCents: 10_000_000,
  originalPeriodKind: 'Fixed',
  originalPeriodStart: new Date('2026-01-01'),
  originalPeriodEnd: new Date('2026-12-31'),
  currentValueCents: 10_000_000,
  currentPeriodKind: 'Fixed',
  currentPeriodStart: new Date('2026-01-01'),
  currentPeriodEnd: new Date('2026-12-31'),
  status: 'Active',
  endedAt: null,
  contractorType: 'Supplier',
  contractorId: SUPPLIER_ID,
  ...overrides,
});

describe('contractFromRow — rehydrates contractorRef', () => {
  it('reads contractor_type + contractor_id into contractorRef', () => {
    const r = contractFromRow(activeRow(), []);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.deepEqual(r.value.contractorRef, { kind: 'Supplier', id: SUPPLIER_ID });
    }
  });
});

describe('contractFromRow — rejects invalid contractor_type', () => {
  it('returns ContractMapperInvalidContractorType for an unknown type', () => {
    const r = contractFromRow(activeRow({ contractorType: 'Bogus' }), []);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractMapperInvalidContractorType');
  });

  it('returns ContractMapperInvalidContractorType for a malformed contractor_id', () => {
    const r = contractFromRow(activeRow({ contractorId: 'not-a-uuid' }), []);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractMapperInvalidContractorType');
  });
});
