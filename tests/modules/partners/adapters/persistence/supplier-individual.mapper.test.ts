/**
 * #1022 — Mapper row ↔ agregado para o fornecedor pessoa física.
 *
 * A ausência de razão social/nome fantasia na PF vira NULL na coluna (nunca sentinela), e uma
 * linha com CPF reidrata sem erro — antes do #1022 ela quebrava na leitura (`Cnpj.parse`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import {
  supplierFromRow,
  supplierToInsert,
} from '#src/modules/partners/adapters/persistence/mappers/supplier.mapper.ts';
import type { SupplierRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const CPF = '12345678909';

const individual = () => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Maria da Silva',
    email: 'maria@example.com',
    document: CPF,
    corporateName: null,
    fantasyName: null,
    serviceCategory: 'INFORMATICA',
    bankAccount: null,
    pixKey: { keyType: 'cpf', key: CPF },
    registeredAt: NOW,
  });
  assert.ok(r.ok);
  return r.value.supplier;
};

// A linha como o SELECT a devolveria: o insert com os opcionais resolvidos (`?? null`), que é o
// que o MySQL guarda para coluna nullable omitida.
const rowOf = (supplier: ReturnType<typeof individual>): SupplierRow => {
  const ins = supplierToInsert(supplier, NOW);
  return {
    id: ins.id,
    name: ins.name,
    email: ins.email,
    document: ins.document,
    corporateName: ins.corporateName ?? null,
    fantasyName: ins.fantasyName ?? null,
    serviceCategory: ins.serviceCategory,
    active: ins.active ?? true,
    deactivatedAt: ins.deactivatedAt ?? null,
    bankAccountBank: ins.bankAccountBank ?? null,
    bankAccountAgency: ins.bankAccountAgency ?? null,
    bankAccountNumber: ins.bankAccountNumber ?? null,
    bankAccountCheckDigit: ins.bankAccountCheckDigit ?? null,
    pixKeyType: ins.pixKeyType ?? null,
    pixKey: ins.pixKey ?? null,
    serviceRating: ins.serviceRating ?? null,
    ratingComment: ins.ratingComment ?? null,
    createdAt: ins.createdAt,
    updatedAt: ins.updatedAt,
    legacyId: ins.legacyId ?? null,
  };
};

describe('supplier.mapper — pessoa física (#1022)', () => {
  it('supplierToInsert grava o CPF em `document` e NULL em razão social/nome fantasia', () => {
    const row = supplierToInsert(individual(), NOW);
    assert.equal(row.document, CPF);
    assert.equal(row.corporateName, null);
    assert.equal(row.fantasyName, null);
  });

  it('supplierFromRow reidrata a linha com CPF como PF (round-trip)', () => {
    const supplier = individual();
    const r = supplierFromRow(rowOf(supplier));
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.deepEqual(r.value.identity, supplier.identity);
  });

  it('linha PF com razão social (estado que o CHECK proíbe) → supplier-mapper-invalid-state', () => {
    const r = supplierFromRow({ ...rowOf(individual()), corporateName: 'Maria LTDA' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-mapper-invalid-state');
  });

  it('documento de tamanho inválido na linha → supplier-mapper-invalid-document', () => {
    const r = supplierFromRow({ ...rowOf(individual()), document: '1234567890' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-mapper-invalid-document');
  });
});
