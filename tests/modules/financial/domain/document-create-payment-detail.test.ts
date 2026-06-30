/**
 * FIN-DOC-PAYMENT-DETAIL (feature 027 / #273) — W0 RED do domínio.
 *
 * Document.create deve aceitar e preservar o atributo opcional `paymentDetail`
 * (complemento da forma de pagamento — texto livre opaco). Ausência → `null` (back-compat).
 *
 * RED esperado: `CreateDocumentInput` e `DocumentCore` ainda NÃO têm `paymentDetail`
 *   - tsc: excess-property no literal de `create({ ...baseInput(), paymentDetail })` (W3 vermelho).
 *   - runtime (`pnpm test` strip-types): `r.value.document.paymentDetail` é `undefined`
 *     → as asserções abaixo falham referenciando o campo inexistente.
 * Estilo espelha `tests/modules/financial/domain/document/document.test.ts` (issueDate #163).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';

const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};

// Input de DOMÍNIO (VOs já construídos; a borda/use case faz a tradução de primitivos).
const baseInput = (): Document.CreateDocumentInput => ({
  id: DocumentId.generate(),
  documentNumber: 'BOL-001',
  type: 'Boleto',
  supplier: supplier(),
  paymentMethod: 'Boleto',
  grossValue: money(100000),
  sourceDiscounts: Money.ZERO,
  discounts: Money.ZERO,
  penalty: Money.ZERO,
  interest: Money.ZERO,
  retentions: [],
  registeredTaxes: [],
  dueDate: new Date('2026-07-01'),
});

describe('financial/domain/document — paymentDetail (#273 / feature 027)', () => {
  it('CA1: create captura e preserva paymentDetail', () => {
    const detail = '34191.79001 01043.510047 91020.150008 9 12345678901234';
    // W0 RED: paymentDetail ainda não existe em CreateDocumentInput/DocumentCore.
    const r = Document.create({ ...baseInput(), paymentDetail: detail });
    assert.ok(r.ok);
    assert.equal(r.value.document.paymentDetail, detail);
  });

  it('CA2: create sem paymentDetail → null (opcional / back-compat)', () => {
    const r = Document.create(baseInput());
    assert.ok(r.ok);
    assert.equal(r.value.document.paymentDetail, null);
  });
});
