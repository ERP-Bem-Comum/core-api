// Testes unitários (in-memory) do PayableDocumentView — W0 RED.
//
// Cobre:
//   CA1: ids vazio → ok([]) sem ir ao banco.
//   CA2: ids conhecidos → linhas com os campos do documento (JOIN in-memory).
//   CA3: id inexistente → ausente no resultado (degradação graciosa, sem erro).
//   CA4: campos nullable respeitados (supplierRef null → null no retorno).

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createInMemoryPayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.in-memory.ts';

describe('financial/adapters — PayableDocumentView in-memory (#146)', () => {
  const PAYABLE_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const PAYABLE_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const DOCUMENT_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const DOCUMENT_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  const SUPPLIER_REF = '11111111-1111-4111-8111-111111111111';
  const CATEGORY_REF = '22222222-2222-4222-8222-222222222222';
  const DUE_DATE = new Date('2026-07-15T00:00:00.000Z');

  // Store in-memory: array de { payableId, documentId, campos doc }
  const rows = [
    {
      payableId: PAYABLE_1,
      documentId: DOCUMENT_1,
      supplierRef: SUPPLIER_REF,
      documentNumber: 'NF-001',
      dueDate: DUE_DATE,
      categoryRef: CATEGORY_REF,
      costCenterRef: null,
      competencia: '2026-07',
      payeeKind: 'supplier',
    },
    {
      payableId: PAYABLE_2,
      documentId: DOCUMENT_2,
      supplierRef: null,
      documentNumber: null,
      dueDate: null,
      categoryRef: null,
      costCenterRef: null,
      competencia: null,
      payeeKind: null,
    },
  ] as const;

  it('CA1: ids vazio → ok([]) sem chamar o banco', async () => {
    const view = createInMemoryPayableDocumentView(rows);
    const r = await view.findByPayableIds([]);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 0);
  });

  it('CA2: ids conhecidos → linhas com os campos do documento', async () => {
    const view = createInMemoryPayableDocumentView(rows);
    const r = await view.findByPayableIds([PAYABLE_1]);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 1);
    const row = r.value[0];
    assert.equal(row?.payableId, PAYABLE_1);
    assert.equal(row?.documentId, DOCUMENT_1);
    assert.equal(row?.supplierRef, SUPPLIER_REF);
    assert.equal(row?.documentNumber, 'NF-001');
    assert.deepEqual(row?.dueDate, DUE_DATE);
    assert.equal(row?.categoryRef, CATEGORY_REF);
    assert.equal(row?.costCenterRef, null);
    assert.equal(row?.competencia, '2026-07');
    assert.equal(row?.payeeKind, 'supplier');
  });

  it('CA3: id inexistente → ausente no resultado (degradação graciosa, sem erro)', async () => {
    const view = createInMemoryPayableDocumentView(rows);
    const unknown = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const r = await view.findByPayableIds([unknown, PAYABLE_1]);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    // Só PAYABLE_1 existe; unknown é ignorado silenciosamente.
    assert.equal(r.value.length, 1);
    assert.equal(r.value[0]?.payableId, PAYABLE_1);
  });

  it('CA4: campos nullable — supplierRef null → null no retorno', async () => {
    const view = createInMemoryPayableDocumentView(rows);
    const r = await view.findByPayableIds([PAYABLE_2]);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const row = r.value[0];
    assert.equal(row?.supplierRef, null);
    assert.equal(row?.documentNumber, null);
    assert.equal(row?.dueDate, null);
    assert.equal(row?.categoryRef, null);
    assert.equal(row?.competencia, null);
    assert.equal(row?.payeeKind, null);
  });

  it('CA5: múltiplos ids conhecidos → todas as linhas correspondentes', async () => {
    const view = createInMemoryPayableDocumentView(rows);
    const r = await view.findByPayableIds([PAYABLE_1, PAYABLE_2]);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 2);
    const ids = new Set(r.value.map((row) => row.payableId));
    assert.equal(ids.has(PAYABLE_1), true);
    assert.equal(ids.has(PAYABLE_2), true);
  });
});
