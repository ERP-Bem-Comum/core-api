/**
 * #1022 — `SupplierDocument`: CPF (PF) ou CNPJ (PJ), decidido pelo formato e validado pelo VO do
 * kernel. Os documentos são sintéticos (DV calculado), nunca dado real de cadastro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as SupplierDocument from '#src/modules/partners/domain/supplier/supplier-document.ts';

const CPF = '12345678909';
const CNPJ = '11222333000181';
const CNPJ_ALPHANUMERIC = '12ABC34501DE35';

describe('SupplierDocument.parse (#1022)', () => {
  it('11 dígitos com DV válido → CPF', () => {
    const r = SupplierDocument.parse(CPF);
    assert.ok(r.ok);
    assert.deepEqual(r.value, { kind: 'cpf', value: CPF });
  });

  it('CPF com máscara → normaliza para 11 dígitos', () => {
    const r = SupplierDocument.parse('123.456.789-09');
    assert.ok(r.ok);
    assert.equal(SupplierDocument.toRaw(r.value), CPF);
  });

  it('14 caracteres → CNPJ', () => {
    const r = SupplierDocument.parse(CNPJ);
    assert.ok(r.ok);
    assert.deepEqual(r.value, { kind: 'cnpj', value: CNPJ });
  });

  it('CNPJ alfanumérico (ADR-0044) → CNPJ, nunca tentado como CPF', () => {
    const r = SupplierDocument.parse(CNPJ_ALPHANUMERIC.toLowerCase());
    assert.ok(r.ok);
    assert.deepEqual(r.value, { kind: 'cnpj', value: CNPJ_ALPHANUMERIC });
  });

  it('CPF com DV errado → invalid-supplier-document', () => {
    const r = SupplierDocument.parse('12345678900');
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-supplier-document');
  });

  it('CNPJ com DV errado → invalid-supplier-document', () => {
    const r = SupplierDocument.parse('11222333000180');
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-supplier-document');
  });

  it('letra em documento de 11 caracteres vai para o CNPJ e é recusada (não vira CPF)', () => {
    const r = SupplierDocument.parse('1234567890A');
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-supplier-document');
  });

  for (const raw of ['', '1234567890', '123456789012', '1122233300018']) {
    it(`tamanho fora de 11/14 ("${raw}") → invalid-supplier-document`, () => {
      const r = SupplierDocument.parse(raw);
      assert.ok(!r.ok);
      assert.equal(r.error, 'invalid-supplier-document');
    });
  }

  it('equals compara tipo e valor', () => {
    const a = SupplierDocument.parse(CPF);
    const b = SupplierDocument.parse('123.456.789-09');
    const c = SupplierDocument.parse(CNPJ);
    assert.ok(a.ok && b.ok && c.ok);
    assert.equal(SupplierDocument.equals(a.value, b.value), true);
    assert.equal(SupplierDocument.equals(a.value, c.value), false);
  });
});
